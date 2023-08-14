// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import {SafeCast} from "./vendor/openzeppelin/v4.9.0/utils/math/SafeCast.sol";
import {IERC20} from "./vendor/openzeppelin/v4.9.0/token/ERC20/IERC20.sol";
import {SafeERC20} from "./vendor/openzeppelin/v4.9.0/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "./vendor/openzeppelin/v4.9.0/security/ReentrancyGuard.sol";
import {UD60x18, ud, exp, intoUint256} from "./vendor/prb/math/v0.4.1/UD60x18.sol";

contract Chest is ERC721URIStorage, ReentrancyGuard {
    using SafeERC20 for IERC20;

    string constant BASE_SVG =
        "<svg id='jellys' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 300 100' shape-rendering='geometricPrecision' text-rendering='geometricPrecision'><defs><linearGradient id='ekns5QaWV3l2-fill' x1='0' y1='0.5' x2='1' y2='0.5' spreadMethod='pad' gradientUnits='objectBoundingBox' gradientTransform='translate(0 0)'><stop id='ekns5QaWV3l2-fill-0' offset='0%' stop-color='#9292ff'/><stop id='ekns5QaWV3l2-fill-1' offset='100%' stop-color='#fb42ff'/></linearGradient></defs><rect width='300' height='111.780203' rx='0' ry='0' transform='matrix(1 0 0 0.900963 0 0)' fill='url(#ekns5QaWV3l2-fill)'/><text dx='0' dy='0' font-family='&quot;jellys:::Montserrat&quot;' font-size='16' font-weight='400' transform='translate(15.979677 32.100672)' fill='#fff' stroke-width='0' xml:space='preserve'><tspan y='0' font-weight='400' stroke-width='0'><![CDATA[{]]></tspan><tspan x='0' y='16' font-weight='400' stroke-width='0'><![CDATA[    until:";

    string constant MIDDLE_PART_SVG =
        "]]></tspan><tspan x='0' y='32' font-weight='400' stroke-width='0'><![CDATA[    amount:";

    string constant END_SVG =
        "]]></tspan><tspan x='0' y='48' font-weight='400' stroke-width='0'><![CDATA[}]]></tspan></text></svg>";

    uint256 immutable BASE_POWER;

    struct Metadata {
        uint256 totalStaked;
        uint48 freezedUntil;
        uint48 latestUnstake;
    }

    uint256 internal tokenId;
    address internal jellyToken;

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
    event Unstake(
        uint256 indexed tokenId,
        uint256 amount,
        uint256 remainedStake
    );

    error Chest__NotAuthorizedForToken();
    error Chest__FreezingPeriodNotOver();
    error Chest__CannotUnstakeMoreThanStaked();

    modifier onlyAuthorizedForToken(uint256 _tokenId) {
        if (!_isApprovedOrOwner(msg.sender, _tokenId))
            revert Chest__NotAuthorizedForToken();
        _;
    }

    constructor(
        address _jellyToken,
        uint256 _basePower
    ) ERC721("Chest", "CHEST") {
        jellyToken = _jellyToken;
        BASE_POWER = _basePower;
    }

    function freeze(
        uint256 _amount,
        uint32 _freezingPeriod
    ) external nonReentrant {
        IERC20(jellyToken).safeTransferFrom(msg.sender, address(this), _amount);

        uint256 currentTokenId = tokenId;

        uint256 freezedUntil = block.timestamp + _freezingPeriod;
        string memory tokenUri = formatTokenUri(_amount, freezedUntil);

        positions[currentTokenId] = Metadata(
            _amount,
            SafeCast.toUint48(freezedUntil),
            SafeCast.toUint48(block.timestamp)
        );

        _safeMint(msg.sender, currentTokenId);
        _setTokenURI(currentTokenId, tokenUri);

        unchecked {
            tokenId++;
        }

        emit Freeze(msg.sender, currentTokenId, _amount, freezedUntil);
    }

    //  They can, at any point in time, increase the amount of staked JLY, or the freezing period
    function increaseStake(
        uint256 _tokenId,
        uint256 _amount,
        uint32 _freezingPeriod
    ) external onlyAuthorizedForToken(_tokenId) nonReentrant {
        IERC20(jellyToken).safeTransferFrom(msg.sender, address(this), _amount);

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

    // Once the freezing period is over they can withdraw some or all of the deposited amount.
    function unstake(
        uint256 _tokenId,
        uint256 _amount
    ) external onlyAuthorizedForToken(_tokenId) nonReentrant {
        // Withdrawing any amount of JLY resets the booster to the initial amount.
        //
        // Revert if freezing period is not over
        // Revert if amount is greater than totalStaked
        // Update the values
        // Reset the booster to 1 by setting the freezingStarted to block.timestamp

        Metadata memory chest = positions[_tokenId];

        if (block.timestamp > chest.freezedUntil) {
            revert Chest__FreezingPeriodNotOver();
        }

        if (_amount > chest.totalStaked) {
            revert Chest__CannotUnstakeMoreThanStaked();
        }

        uint256 newTotalStaked = chest.totalStaked - _amount;
        uint48 latestUnstake = SafeCast.toUint48(block.timestamp);

        positions[_tokenId].totalStaked = newTotalStaked;
        positions[_tokenId].latestUnstake = latestUnstake;

        IERC20(jellyToken).safeTransfer(msg.sender, _amount);

        emit Unstake(_tokenId, _amount, newTotalStaked);
    }

    function calculateBooster(uint256 _tokenId) public view returns (uint256) {
        Metadata memory chest = positions[_tokenId];
        uint256 maximumValue = chest.totalStaked;

        int256 K = 100;
        uint256 timeSinceUnstaked = block.timestamp - chest.latestUnstake;
        uint256 exponent = (uint256(-K) * (timeSinceUnstaked / 2)) / 1000;
        UD60x18 x = ud(exponent);

        return maximumValue / (1 + intoUint256(exp(x)));
    }

    function getChestPower(uint256 _tokenId) external view returns (uint256) {
        // Each NFT has a certain amount of “power”, calculated by the following formula: power = booster * depositedJelly * (Min(0, unfreezingTime - currentTime) + basePower).

        Metadata memory chest = positions[_tokenId];
        uint256 booster = calculateBooster(_tokenId);
        return
            booster *
            chest.totalStaked *
            (min(0, chest.freezedUntil - block.timestamp) + BASE_POWER);
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
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
}
