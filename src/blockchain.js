/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because an array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that returns a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happened during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't forget 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */

    /** 
     getLatestBlock() auxiliary function to get latest block
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1]; 
    }

    _addBlock(block) {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            // Note: Remember not to calculate the HASH until after all elements are in
            block.height = self.chain.length;
            block.time = new Date().getTime().toString().slice(0, -3);
            if (self.chain.length > 0) {
                block.previousBlockHash = self.chain[self.chain.length - 1].hash;
            }
            block.hash = SHA256(JSON.stringify(block)).toString();
            // Add new block
            // Validate each block
            let validation = await block.validate();
            if (!validation) {
                console.log("Block validation error");
                errorLog.push("Block validation error");
                reject(errorLog);
            } else {
                console.log("Block Validated");
                self.chain.push(block);
                self.height += 1;
                resolve(block);
                reject(Error("Error adding block"));
                //if (self.chain[self.height] == block) {
                //    resolve(block);
                //} else {
                //    reject(Error("Error adding block"));
               // }
            }
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submiting your Block.
     * The method returns a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            const timestamp = new Date().getTime().toString().slice(0, -3)
            const message = address + ':' + timestamp + ':starRegistry';
            resolve(message);
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise((resolve, reject) => {
            if (self.validateChain()) {
                let timeMessage = parseInt(message.split(':')[1]);
                let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));
                if (currentTime - timeMessage < 60 * 5) {
                    let isVerified = bitcoinMessage.verify(message, address, signature);
                    if (isVerified) {
                        const block = new BlockClass.Block({ "owner": address, "star": star });
                        resolve(self._addBlock(block));
                    } else {
                        reject("Signature is not valid");
                    }
                } else {
                    reject("Validation time exceeeds the limit of 5 minutes");
                }
            } else {
                console.log("Chain invalid");
                reject("Validation unsuccesful");
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(block => block.hash === hash);
            if (block) {
                resolve(block);
            } else {
                reject(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                reject(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and that belong to the owner with the wallet address passed as a parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            console.log("Entering promise on getStarsByWalletAddress")
            self.chain.forEach((block) => {
                let BData = block.getBData();
                if (BData) {
                    if (BData.owner === address) {
                        stars.push(BData);
                    }
                }
            });
            resolve(stars);
            //TO DO: Why is the filter not working
            //let filteredBlocks = self.chain.filter(block => block.owner === address);
            //console.log(filteredBlocks);
            //if (filteredBlocks.length === 0) {
            //    reject(new Error('Address not found.'));
            //} else {
            //    stars = filteredBlocks.map(block => JSON.parse(hex2ascii(block.body)));
            //    if (stars) {
            //        resolve(stars);
            //    } else {
            //        reject(new Error('Could not return stars'));
            //    }
            //}
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLogBLocks = [];
        return new Promise(async (resolve, _) => {
            self.chain.forEach(block => {
                if (!block.validate()) {
                    errorLogBLocks.push(block);
                    console.log("Invalid block")
                }
            });
            resolve(errorLogBLocks == [])
        });
    }

}

module.exports.Blockchain = Blockchain;   