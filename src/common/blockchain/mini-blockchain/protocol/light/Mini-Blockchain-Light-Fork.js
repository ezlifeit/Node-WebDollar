import consts from 'consts/const_global'
import MiniBlockchainFork from "./../Mini-Blockchain-Fork"
import InterfaceBlockchainBlockValidation from "common/blockchain/interface-blockchain/blocks/validation/Interface-Blockchain-Block-Validation"
import BlockchainMiningReward from 'common/blockchain/global/Blockchain-Mining-Reward'

class MiniBlockchainLightFork extends MiniBlockchainFork {

    constructor(blockchain, forkId, sockets, forkStartingHeight, forkChainStartingPoint, newChainLength, header) {

        super(blockchain, forkId, sockets, forkStartingHeight, forkChainStartingPoint, newChainLength, header)

        this.forkPrevAccountantTree = null;
        this.forkPrevDifficultyTarget = null;
        this.forkPrevTimeStamp = null;
        this.forkPrevHashPrev = null;

        this.forkDifficultyCalculation = {
            difficultyAdditionalBlocks: [],
            difficultyCalculationStarts: 0,
        };

        this._blocksStartingPointClone = null;
        this._lightPrevDifficultyTargetClone = null;
        this._lightPrevTimeStampClone = null;
        this._lightPrevHashPrevClone = null;
        this._lightAccountantTreeSerializationsHeightClone = null;
    }

    // return the difficultly target for ForkBlock
    getForkDifficultyTarget(height){

        let forkHeight = height - this.forkStartingHeight;

        if (this.forkChainStartingPoint === this.forkStartingHeight && height !== 0 && height === this.forkStartingHeight){
            if (this.forkPrevDifficultyTarget === null || this.forkPrevDifficultyTarget === undefined) throw {message: "forkPrevDifficultyTarget was not specified"};
            return this.forkPrevDifficultyTarget;
        }

        return MiniBlockchainFork.prototype.getForkDifficultyTarget.call(this, height);

    }

    getForkTimeStamp(height){

        let forkHeight = height - this.forkStartingHeight;

        if (this.forkChainStartingPoint === this.forkStartingHeight && height !== 0 && height === this.forkStartingHeight){
            if (this.forkPrevTimeStamp === null || this.forkPrevTimeStamp === undefined)
                throw {message: "forkPrevTimeStamp was not specified"};
            return this.forkPrevTimeStamp;
        }

        return MiniBlockchainFork.prototype.getForkTimeStamp.call(this, height);

    }

    getForkPrevHash(height){

        let forkHeight = height - this.forkStartingHeight;

        if (this.forkChainStartingPoint === this.forkStartingHeight && height !== 0 && height === this.forkStartingHeight){
            if (this.forkPrevHashPrev === null || this.forkPrevHashPrev === undefined)
                throw {message: "forkPrevHashPrev was not specified"};
            return this.forkPrevHashPrev;
        }

        return MiniBlockchainFork.prototype.getForkPrevHash.call(this, height);
    }

    _createBlockValidation_ForkValidation(height, forkHeight){

        let validationType = {
            "skip-accountant-tree-validation": true,
            "skip-validation-transactions-from-values": true,
        };

        if ( height < this.forkDifficultyCalculation.difficultyCalculationStarts)
            validationType["skip-difficulty-recalculation"] = true;

        if (height === this.forkChainLength-1)
            validationType["validation-timestamp-adjusted-time"] = true;

        //it's a new light fork && i have less than forkHeight
        if (this.forkChainStartingPoint === this.forkStartingHeight && forkHeight < consts.BLOCKCHAIN.TIMESTAMP.VALIDATION_NO_BLOCKS )
            validationType["skip-validation-timestamp"] = true;

        if (this.forkProofPi !== null && forkHeight < this.forkChainLength - consts.POPOW_PARAMS.m)
            validationType["skip-validation-interlinks"] = true;


        return new InterfaceBlockchainBlockValidation(  this.forkProofPi !== null ? this.getForkProofsPiBlock.bind(this) : this.getForkBlock.bind(this), this.getForkDifficultyTarget.bind(this), this.getForkTimeStamp.bind(this), this.getForkPrevHash.bind(this), validationType );
    }

    _createBlockValidation_BlockchainValidation(height, forkHeight){
        let validationType = {};

        if ( height < this.forkDifficultyCalculation.difficultyCalculationStarts)
            validationType["skip-difficulty-recalculation"] = true;

        if (height === this.forkChainLength-1)
            validationType["validation-timestamp-adjusted-time"] = true;

        //it's a new light fork && i have less than forkHeight
        if (this.forkChainStartingPoint === this.forkStartingHeight && forkHeight < consts.BLOCKCHAIN.TIMESTAMP.VALIDATION_NO_BLOCKS )
            validationType["skip-validation-timestamp"] = true;

        if (this.forkProofPi !== null && forkHeight < this.forkChainLength - consts.POPOW_PARAMS.m)
            validationType["skip-validation-interlinks"] = true;

        if ( forkHeight === 0)
            validationType["skip-interlinks-update"] = true;

        return new InterfaceBlockchainBlockValidation(   this.forkProofPi !== null ? this.getForkProofsPiBlock.bind(this) : this.getForkBlock.bind(this), this.getForkDifficultyTarget.bind(this), this.getForkTimeStamp.bind(this), this.getForkPrevHash.bind(this), validationType );
    }

    preForkClone(){

        if (this.forkChainStartingPoint === this.forkStartingHeight &&
            this.forkPrevAccountantTree !== null && Buffer.isBuffer(this.forkPrevAccountantTree)){

            let diffIndex = this.forkDifficultyCalculation.difficultyAdditionalBlocks[0];

            this._blocksStartingPointClone = this.blockchain.blocks.blocksStartingPoint;
            this._lightAccountantTreeSerializationsHeightClone = new Buffer(this.blockchain.lightAccountantTreeSerializations[diffIndex] !== undefined ? this.blockchain.lightAccountantTreeSerializations[diffIndex] : 0);
            this._lightPrevDifficultyTargetClone = new Buffer(this.blockchain.lightPrevDifficultyTargets[diffIndex] !== undefined ? this.blockchain.lightPrevDifficultyTargets[diffIndex] : 0);
            this._lightPrevTimeStampClone = this.blockchain.lightPrevTimeStamps[diffIndex];
            this._lightPrevHashPrevClone = new Buffer(this.blockchain.lightPrevHashPrevs[diffIndex] !== undefined ? this.blockchain.lightPrevHashPrevs[diffIndex] : 0);

            //it is just a simple fork
            return MiniBlockchainFork.prototype.preForkClone.call(this, true, true );

        } else
        //it is just a simple fork
            return MiniBlockchainFork.prototype.preForkClone.call(this, true, false );

    }

    preFork(revertActions) {

        if (this.blockchain.agent.light && this._shouldTakeNewProof() ) {
            this.blockchain.proofPi = this.forkProofPi;
        }

        // I have a new accountant Tree, so it is a new [:-m] light proof

        if (this.forkChainStartingPoint === this.forkStartingHeight &&
            this.forkPrevAccountantTree !== null && Buffer.isBuffer(this.forkPrevAccountantTree)){

            let diffIndex = this.forkDifficultyCalculation.difficultyAdditionalBlocks[0];

            //fork sum
            this.blockchain.accountantTree.deserializeMiniAccountant( this.forkPrevAccountantTree );
            let forkSum = this.blockchain.accountantTree.calculateNodeCoins();

            if ( forkSum !== BlockchainMiningReward.getSumReward(diffIndex-1) || forkSum <= 0 )
                throw {message: "Accountant Tree sum is smaller than previous accountant Tree!!! Impossible", forkSum: forkSum, rewardShould: BlockchainMiningReward.getSumReward(diffIndex-1)};

            this.blockchain.blocks.blocksStartingPoint = diffIndex;
            this.blockchain.lightPrevDifficultyTargets[diffIndex] = this.forkPrevDifficultyTarget;
            this.blockchain.lightPrevTimeStamps[diffIndex] = this.forkPrevTimeStamp;
            this.blockchain.lightPrevHashPrevs[diffIndex] = this.forkPrevHashPrev;

            this.blockchain.lightAccountantTreeSerializations[diffIndex] = this.forkPrevAccountantTree;

        } else
            //it is just a simple fork
            return MiniBlockchainFork.prototype.preFork.call(this, revertActions);
    }

    revertFork(){

        //recover to the original Accountant Tree & state
        if (this.forkPrevAccountantTree !== null && Buffer.isBuffer(this.forkPrevAccountantTree)){

            this.blockchain.blocks.blocksStartingPoint = this._blocksStartingPointClone;

            let diffIndex = this.forkDifficultyCalculation.difficultyAdditionalBlocks[0];

            this.blockchain.lightPrevDifficultyTargets[diffIndex] = this._lightPrevDifficultyTargetClone;
            this.blockchain.lightPrevTimeStamps[diffIndex] = this._lightPrevTimeStampClone;
            this.blockchain.lightPrevHashPrevs[diffIndex] = this._lightPrevHashPrevClone;
            this.blockchain.lightAccountantTreeSerializations[diffIndex] = this._lightAccountantTreeSerializationsHeightClone;

        }

        return MiniBlockchainFork.prototype.revertFork.call(this);
    }

    async saveIncludeBlock(index, revertActions){

        let answer = await MiniBlockchainFork.prototype.saveIncludeBlock.call(this, index, revertActions);

        if (answer){

            if (this.forkChainStartingPoint === this.forkStartingHeight && index === 0)
                this.forkBlocks[index].difficultyTarget = this.forkDifficultyCalculation.difficultyAdditionalBlockFirstDifficulty
        }

        return answer;
    }

}

export default MiniBlockchainLightFork