// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import {IERC7412} from './IERC7412.sol';
import {PrimaryProdDataServiceConsumerBase} from '@redstone-finance/evm-connector/contracts/data-services/PrimaryProdDataServiceConsumerBase.sol';

contract ERC7412RedstoneFeed is IERC7412, PrimaryProdDataServiceConsumerBase {

    bytes32 constant ORACLE_ID = bytes32("REDSTONE");
    bytes32 constant FEED_ID = bytes32("BTC"); 

    // 1 hour
    uint256 constant TTL = 3600;
    uint256 lastTimestamp = 0;
    uint256 latestAnswer = 0;

    function oracleId() pure external returns (bytes32) {
        return ORACLE_ID;
    }

    function getFeedId() pure external returns (bytes32) {
        return FEED_ID;
    }

    function getLatestValue() view external returns (uint256) {
        if (latestAnswer != 0 && block.timestamp - lastTimestamp < TTL) {
            return latestAnswer;
        }

        revert OracleDataRequired(
            address(this),
            abi.encode(FEED_ID, getUniqueSignersThreshold(), getDataServiceId())
        );
    }

    function fulfillOracleQuery(bytes calldata signedOffchainData) payable external {
        signedOffchainData; // is used in getOracleNumericValueFromTxMsg
        latestAnswer = getOracleNumericValueFromTxMsg(FEED_ID);
        lastTimestamp = block.timestamp;
    }
   
}
