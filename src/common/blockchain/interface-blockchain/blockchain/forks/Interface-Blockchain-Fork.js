const colors = require('colors/safe');
import global from "consts/global"

/**
 * Blockchain contains a chain of blocks based on Proof of Work
 */
class InterfaceBlockchainFork {


    constructor (blockchain, forkId, sockets, forkStartingHeight, forkChainStartingPoint, newChainLength, header){

        this.blockchain = blockchain;

        this.forkId = forkId;

        if (!Array.isArray(sockets))
            sockets = [sockets];

        this.sockets = sockets;
        this.forkStartingHeight = forkStartingHeight||0;

        this.forkChainStartingPoint = forkChainStartingPoint;
        this.forkChainLength = newChainLength||0;
        this.forkBlocks = [];
        this.forkHeader = header;

        this._blocksCopy = [];

    }

    async validateFork(){

        for (let i=0; i<this.forkBlocks.length; i++){

            if (! await this.validateForkBlock( this.forkBlocks[i], this.forkStartingHeight + i )) return false;

        }

        return true;
    }

    async includeForkBlock(block){

        if (! await this.validateForkBlock(block, block.height ) ) return false;

        this.forkBlocks.push(block);

        return true;
    }

    /**
     * It Will only validate the hashes of the Fork Blocks
     */
    async validateForkBlock(block, height, blockValidationType){

        //calcuate the forkHeight
        let forkHeight = block.height - this.forkStartingHeight;

        if (block.height < this.forkStartingHeight) throw 'block height is smaller than the fork itself';
        if (block.height !== height) throw "block height is different than block's height";

        let prevData = this._getForkPrevsData(height, forkHeight);

        if (blockValidationType === undefined)
            blockValidationType = prevData.blockValidationType;

        block.difficultyTargetPrev = prevData.prevDifficultyTarget;

        return await this.blockchain.validateBlockchainBlock(block, prevData.prevDifficultyTarget, prevData.prevHash, prevData.prevTimeStamp, blockValidationType );

        //recalculate next target difficulty automatically

    }

    _getForkPrevsData(height, forkHeight){

        // transition from blockchain to fork
        if (height === 0)

            // based on genesis block
            return {
                prevDifficultyTarget : undefined,
                prevHash : undefined,
                prevTimeStamp : undefined,
                blockValidationType: {},
            };

        else if ( forkHeight === 0)

            // based on previous block from blockchain

            return {
                prevDifficultyTarget : this.blockchain.blocks[height-1].difficultyTarget,
                prevHash : this.blockchain.blocks[height-1].hash,
                prevTimeStamp : this.blockchain.blocks[height-1].timeStamp,
                blockValidationType:  {},
            };

        else  // just the fork

            return {
                prevDifficultyTarget : this.forkBlocks[forkHeight - 1].difficultyTarget,
                prevHash : this.forkBlocks[forkHeight - 1].hash,
                prevTimeStamp : this.forkBlocks[forkHeight - 1].timeStamp,
                blockValidationType: {},
            }

    }


    /**
     * Validate the Fork and Use the fork as main blockchain
     */
    async saveFork(){

        if (global.TERMINATED) return false;

        if (!await this.validateFork()) {
            console.log(colors.red("validateFork was not passed"));
            return false
        }
        // to do

        let useFork = false;

        if (this.blockchain.getBlockchainLength < this.forkStartingHeight + this.forkBlocks.length)
            useFork = true;
        else
        if (this.blockchain.getBlockchainLength === this.forkStartingHeight + this.forkBlocks.length){ //I need to check

        }

        //overwrite the blockchain blocks with the forkBlocks
        if (useFork){

            let success = await this.blockchain.processBlocksSempahoreCallback( async () => {

                //making a copy of the current blockchain
                this._blocksCopy = [];
                for (let i = this.forkStartingHeight; i < this.blockchain.getBlockchainLength; i++)
                    this._blocksCopy.push(this.blockchain.blocks[i]);

                this.blockchain.spliceBlocks(this.forkStartingHeight);

                this.preFork();

                let forkedSuccessfully = true;


                console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
                console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
                console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')

                await this.postForkBefore(forkedSuccessfully);

                for (let i = 0; i < this.forkBlocks.length; i++)
                    if (!await this.blockchain.includeBlockchainBlock(this.forkBlocks[i], (i === this.forkBlocks.length - 1), "all", false, {})) {
                        console.log(colors.green("fork couldn't be included in main Blockchain ", i));
                        forkedSuccessfully = false;
                        break;
                    }

                //revert the last K blocks
                if (!forkedSuccessfully) {

                    this.blockchain.spliceBlocks(this.forkStartingHeight);

                    for (let i = 0; i < this._blocksCopy.length; i++)
                        if (!await this.blockchain.includeBlockchainBlock(this._blocksCopy[i], (i === this._blocksCopy.length - 1), "all", false, {})) {
                            console.log(colors.green("blockchain couldn't restored after fork included in main Blockchain ", i));
                            break;
                        }
                }

                await this.postFork(forkedSuccessfully);

                //propagating valid blocks
                if (forkedSuccessfully) {
                    await this.blockchain.save();
                    this.blockchain.mining.resetMining();
                }

                return forkedSuccessfully;
            });

            // it was done successfully
            console.log("FORK SOLVER SUCCESS", success);
            if (success){

                //propagate last block
                this.blockchain.propagateBlocks(this.blockchain.blocks.length-1, this.sockets);

                //this.blockchain.propagateBlocks(this.forkStartingHeight, this.sockets);

            }

            return success;

        }

        return false;
    }



    preFork(){

    }


    postForkBefore(forkedSuccessfully){

    }

    postFork(forkedSuccessfully){

    }


}

export default InterfaceBlockchainFork;