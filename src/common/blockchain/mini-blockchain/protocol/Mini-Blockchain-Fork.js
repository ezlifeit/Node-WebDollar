import PPoWBlockchainFork from "common/blockchain/ppow-blockchain/protocol/PPoW-Blockchain-Fork"
import InterfaceBlockchainFork from 'common/blockchain/interface-blockchain/blockchain/forks/Interface-Blockchain-Fork'
import consts from "consts/const_global";
import InterfaceBlockchainBlockValidation from "common/blockchain/interface-blockchain/blocks/validation/Interface-Blockchain-Block-Validation"

let inheritFork;
if (consts.POPOW_PARAMS.ACTIVATED) inheritFork = PPoWBlockchainFork;
else inheritFork = InterfaceBlockchainFork;

class MiniBlockchainFork extends inheritFork{


    constructor(blockchain, forkId, sockets, forkStartingHeight, forkChainStartingPoint, newChainLength, header){

        super(blockchain, forkId, sockets, forkStartingHeight, forkChainStartingPoint, newChainLength, header)

        this._accountantTreeClone = null;

    }

    /**
     * Fork Validation for Mini Blockchain is not checking the Accountant Tree
     */
    _createBlockValidation_ForkValidation(height, forkHeight){

        let validationType = {"skip-accountant-tree-validation": true};

        if (height === this.forkChainLength-1)
            validationType["validation-timestamp-adjusted-time"] = true;

        return new InterfaceBlockchainBlockValidation(this.getForkDifficultyTarget.bind(this), this.getForkTimeStamp.bind(this), this.getForkPrevHash.bind(this), validationType );
    }

    _preForkCloneAccounantTree(){

    }

    preForkClone(cloneBlocks=true, cloneAccountantTree=true){

        InterfaceBlockchainFork.prototype.preForkClone.call(this, cloneBlocks);

        if (!cloneAccountantTree) {

            try {
                //clone the Accountant Tree
                this._accountantTreeClone = this.blockchain.accountantTree.serializeMiniAccountant();
            } catch (exception){
                console.error("Error cloding Accountant Tree", exception);
                return false;
            }
        }


    }

    preFork(revertActions){

        console.log("preFork positions", this.forkStartingHeight, this.blockchain.blocks.length-1);

        //remove transactions and rewards from each blocks
        for (let i = this.blockchain.blocks.length - 1; i >= this.forkStartingHeight; i--) {

            let block = this.blockchain.blocks[i];

            // remove reward

            this.blockchain.accountantTree.updateAccount(block.data.minerAddress, -block.reward, undefined, revertActions);

            // remove transactions
            for (let j=block.data.transactions.transactions.length-1; j>=0; j--)
                block.data.transactions.transactions[j].processTransaction( -1, revertActions );

        }

    }

    revertFork(){

        //recover to the original Accountant Tree
        this.blockchain.accountantTree.deserializeMiniAccountant(this._accountantTreeClone);

    }

    postFork(forkedSuccessfully){
        return InterfaceBlockchainFork.prototype.postFork.call(this, forkedSuccessfully);
    }

}

export default MiniBlockchainFork