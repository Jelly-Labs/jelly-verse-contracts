// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import {SafeCast} from "./vendor/openzeppelin/v4.9.0/utils/math/SafeCast.sol";
import {IERC20} from "./vendor/openzeppelin/v4.9.0/token/ERC20/IERC20.sol";
import {SafeERC20} from "./vendor/openzeppelin/v4.9.0/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "./vendor/openzeppelin/v4.9.0/security/ReentrancyGuard.sol";
import {UD60x18, ud, exp, intoUint256} from "./vendor/prb/math/v0.4.1/UD60x18.sol";
import {Ownable} from "./utils/Ownable.sol";

contract Chest is ERC721URIStorage, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Metadata {
        uint256 totalStaked; //
        uint256 unfrozen; //
        uint48 freezedUntil; // ──╮
        uint48 latestUnstake; // ─╯
    }

    string constant BASE_SVG =
        "<svg id='jellys' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 300 100' shape-rendering='geometricPrecision' text-rendering='geometricPrecision'><defs><linearGradient id='ekns5QaWV3l2-fill' x1='0' y1='0.5' x2='1' y2='0.5' spreadMethod='pad' gradientUnits='objectBoundingBox' gradientTransform='translate(0 0)'><stop id='ekns5QaWV3l2-fill-0' offset='0%' stop-color='#9292ff'/><stop id='ekns5QaWV3l2-fill-1' offset='100%' stop-color='#fb42ff'/></linearGradient></defs><rect width='300' height='111.780203' rx='0' ry='0' transform='matrix(1 0 0 0.900963 0 0)' fill='url(#ekns5QaWV3l2-fill)'/><text dx='0' dy='0' font-family='&quot;jellys:::Montserrat&quot;' font-size='16' font-weight='400' transform='translate(15.979677 32.100672)' fill='#fff' stroke-width='0' xml:space='preserve'><tspan y='0' font-weight='400' stroke-width='0'><![CDATA[{]]></tspan><tspan x='0' y='16' font-weight='400' stroke-width='0'><![CDATA[    until:";

    string constant MIDDLE_PART_SVG =
        "]]></tspan><tspan x='0' y='32' font-weight='400' stroke-width='0'><![CDATA[    amount:";

    string constant END_SVG =
        "]]></tspan><tspan x='0' y='48' font-weight='400' stroke-width='0'><![CDATA[}]]></tspan></text></svg>";

    address internal immutable i_jellyToken;

    uint256 internal tokenId;
    uint256 public fee;
    uint256 internal boosterThreshold;
    uint256 internal minimalStakingPower;
    uint256 internal maxBooster;
    uint256 internal timeFactor;
    uint48 internal startTimestamp;
    uint48 internal cliffTimestamp;
    bool public isVestingStarted;

    mapping(uint256 => Metadata) internal positions;

    event Freeze(
        address indexed user,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 freezedUntil
    );
    event IncreaseStake(
        uint256 indexed tokenId,
        uint256 totalStaked,
        uint256 freezedUntil
    );
    event Unstake(uint256 indexed tokenId, uint256 amount, uint256 totalStaked);
    event SetFee(uint256 fee);
    event SetBoosterThreshold(uint256 boosterThreshold);
    event SetMinimalStakingPower(uint256 minimalStakingPower);
    event SetMaxBooster(uint256 maxBooster);

    error Chest__ZeroAddress();
    error Chest__NonTransferrableToken();
    error Chest__NotAuthorizedForToken();
    error Chest__FreezingPeriodNotOver();
    error Chest__CannotUnstakeMoreThanReleasable();
    error Chest__NothingToUnstake();

    modifier onlyAuthorizedForToken(uint256 _tokenId) {
        if (!_isApprovedOrOwner(msg.sender, _tokenId))
            revert Chest__NotAuthorizedForToken();
        _;
    }

    constructor(
        address _jellyToken,
        uint256 _fee,
        uint256 _boosterThreshold,
        uint256 _minimalStakingPower,
        uint256 _maxBooster,
        uint256 _timeFactor,
        uint48 _startTimestamp,
        uint32 _cliffDuration,
        address _owner,
        address _pendingOwner
    ) ERC721("Chest", "CHEST") Ownable(_owner, _pendingOwner) {
        if (_jellyToken == address(0)) revert Chest__ZeroAddress();

        i_jellyToken = _jellyToken;
        fee = _fee;
        boosterThreshold = _boosterThreshold;
        minimalStakingPower = _minimalStakingPower;
        maxBooster = _maxBooster;
        timeFactor = _timeFactor;
        startTimestamp = _startTimestamp;
        cliffTimestamp = _startTimestamp + SafeCast.toUint48(_cliffDuration);
    }

    /**
     * @notice Freezes tokens for vesting.
     *
     * @param _amount - amount of tokens to freeze.
     * @param _freezingPeriod - duration of freezing period in seconds.
     * @param _to - address of the beneficiary.
     *
     * No return, reverts on error.
     */
    function freeze(
        uint256 _amount,
        uint32 _freezingPeriod,
        address _to
    ) external nonReentrant {
        IERC20(i_jellyToken).safeTransferFrom(
            msg.sender,
            address(this),
            _amount + fee
        );

        uint256 currentTokenId = tokenId;

        uint256 freezedUntil = cliffTimestamp + _freezingPeriod;
        string memory tokenUri = formatTokenUri(_amount, freezedUntil);

        positions[currentTokenId].totalStaked = _amount;
        positions[currentTokenId].freezedUntil = SafeCast.toUint48(
            freezedUntil
        );
        positions[currentTokenId].latestUnstake = SafeCast.toUint48(
            block.timestamp
        );

        _safeMint(_to, currentTokenId);
        _setTokenURI(currentTokenId, tokenUri);

        unchecked {
            ++tokenId;
        }

        emit Freeze(msg.sender, currentTokenId, _amount, freezedUntil);
    }

    /**
     * @notice Increases stake.
     *
     * @param _tokenId - id of the chest.
     * @param _amount - amount of tokens to stake.
     * @param _freezingPeriod - duration of freezing period in seconds.
     *
     * No return, reverts on error.
     */
    function increaseStake(
        uint256 _tokenId,
        uint256 _amount,
        uint32 _freezingPeriod
    ) external onlyAuthorizedForToken(_tokenId) nonReentrant {
        IERC20(i_jellyToken).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        Metadata memory chest = positions[_tokenId];

        uint256 newTotalStaked = chest.totalStaked + _amount;
        uint48 newFreezedUntil = chest.freezedUntil +
            SafeCast.toUint48(_freezingPeriod);

        positions[_tokenId].totalStaked = newTotalStaked;
        positions[_tokenId].freezedUntil = newFreezedUntil;

        string memory tokenUri = formatTokenUri(
            newTotalStaked,
            newFreezedUntil
        );

        _setTokenURI(_tokenId, tokenUri);

        emit IncreaseStake(_tokenId, newTotalStaked, newFreezedUntil);
    }

    /**
     * @notice Unstakes tokens.
     *
     * @param _tokenId - id of the chest.
     * @param _amount - amount of tokens to unstake.
     *
     * No return, reverts on error.
     */
    function unstake(
        uint256 _tokenId,
        uint256 _amount
    ) external onlyAuthorizedForToken(_tokenId) nonReentrant {
        Metadata memory chest = positions[_tokenId];

        uint256 _releasableAmount = releasableAmount(_tokenId);

        if (_releasableAmount == 0) {
            revert Chest__NothingToUnstake();
        }

        if (_amount > _releasableAmount) {
            revert Chest__CannotUnstakeMoreThanReleasable();
        }

        uint256 newTotalStaked = chest.totalStaked - _amount;
        uint48 latestUnstake = SafeCast.toUint48(block.timestamp);

        positions[_tokenId].totalStaked = newTotalStaked;
        positions[_tokenId].latestUnstake = latestUnstake;

        IERC20(i_jellyToken).safeTransfer(msg.sender, _amount);

        emit Unstake(_tokenId, _amount, newTotalStaked);
    }

    /**
     * @notice Calculates amount of tokens that can be released at the moment.
     *
     * @param _tokenId - id of the chest.
     *
     * @return uint256 - Amount of tokens that can be released at the moment.
     */
    function releasableAmount(uint256 _tokenId) public view returns (uint256) {
        if (isVestingStarted) {
            return vestedAmount(_tokenId) - positions[_tokenId].unfrozen;
        } else {
            return 0;
        }
    }

    /**
     * @notice Sets fee in Jelly token for minting a chest.
     * @dev Only owner can call.
     *
     * @param _fee - new fee.
     *
     * No return, reverts on error.
     */
    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
        emit SetFee(_fee);
    }

    /**
     * @notice Sets booster threshold.
     * @dev Only owner can call.
     *
     * @param _boosterThreshold - new booster threshold.
     *
     * No return, reverts on error.
     */
    function setBoosterThreshold(uint256 _boosterThreshold) external onlyOwner {
        boosterThreshold = _boosterThreshold;
        emit SetBoosterThreshold(_boosterThreshold);
    }

    /**
     * @notice Sets minimal staking power.
     * @dev Only owner can call.
     *
     * @param _minimalStakingPower - new minimal staking power.
     *
     * No return, reverts on error.
     */
    function setMinimalStakingPower(
        uint256 _minimalStakingPower
    ) external onlyOwner {
        minimalStakingPower = _minimalStakingPower;
        emit SetMinimalStakingPower(_minimalStakingPower);
    }

    /**
     * @notice Sets maximal booster.
     * @dev Only owner can call.
     *
     * @param _maxBooster - new maximal booster.
     *
     * No return, reverts on error.
     */
    function setMaxBooster(uint256 _maxBooster) external onlyOwner {
        maxBooster = _maxBooster;
        emit SetMaxBooster(_maxBooster);
    }

    /**
     * @notice Calculates the booster of the chest.
     *
     * @param _tokenId - id of the chest.
     *
     * @return booster - booster of the chest.
     */
    function calculateBooster(
        uint256 _tokenId
    ) public view returns (uint256 booster) {
        Metadata memory chest = positions[_tokenId];
        if (chest.totalStaked > boosterThreshold) {
            int256 K = 100;
            uint256 timeSinceUnstaked = block.timestamp - chest.latestUnstake;
            uint256 exponent = (uint256(-K) * (timeSinceUnstaked / 2)) / 1000;
            UD60x18 x = ud(exponent);
            booster = maxBooster / (1 + intoUint256(exp(x)));
        } else {
            booster = 1;
        }
    }

    /**
     * @notice Calculates the voting power of the chest.
     *
     * @param _tokenId - id of the chest.
     *
     * @return power - voting power of the chest.
     */
    function getChestPower(
        uint256 _tokenId
    ) external view returns (uint256 power) {
        Metadata memory chest = positions[_tokenId];
        uint256 _minimalStakingPower = minimalStakingPower;
        uint48 _cliffTimestamp = cliffTimestamp;
        uint256 _timeFactor = timeFactor;

        uint256 booster = calculateBooster(_tokenId);

        uint256 unfreezingWaitTime = isVestingStarted
            ? ((chest.freezedUntil - block.timestamp) / 2) * _timeFactor
            : (_cliffTimestamp - block.timestamp) +
                ((chest.freezedUntil - _cliffTimestamp) / 2) *
                _timeFactor;

        power =
            booster *
            ((chest.totalStaked - chest.unfrozen) *
                (unfreezingWaitTime + _minimalStakingPower) +
                chest.unfrozen *
                _minimalStakingPower);
    }

    function formatTokenUri(
        uint256 _amount,
        uint256 _freezedUntil
    ) internal pure returns (string memory) {
        string memory svg = string(
            abi.encodePacked(
                BASE_SVG,
                Strings.toString(_freezedUntil),
                MIDDLE_PART_SVG,
                Strings.toString(_amount),
                END_SVG
            )
        );

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Jelly Chest", "description": "NFT that represents a staking position", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(svg)),
                        '"}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function vestedAmount(
        uint256 _tokenId
    ) internal view returns (uint256 vestedAmount_) {
        Metadata memory chest = positions[_tokenId];

        if (block.timestamp < cliffTimestamp) {
            vestedAmount_ = 0;
        } else if (block.timestamp >= chest.freezedUntil) {
            vestedAmount_ = chest.totalStaked;
        } else {
            unchecked {
                vestedAmount_ =
                    (chest.totalStaked * (block.timestamp - startTimestamp)) /
                    (chest.freezedUntil - startTimestamp);
            }
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256,
        uint256
    ) internal pure override {
        if (!(from == address(0) || to == address(0))) {
            revert Chest__NonTransferrableToken();
        }
    }
}
