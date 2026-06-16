import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { 
  deployContract, 
  deployUUPS, 
  deployGameExt, 
  deployHub,
} from "../utils/deployment";
import { ZERO_ADDR, test_uri, test_uri2 } from "../utils/consts";
import { HubUpgradable } from '../typechain-types/contracts/HubUpgradable';
import { SoulUpgradable } from '../typechain-types/contracts/SoulUpgradable';
import { ActionRepoTrackerUp } from '../typechain-types/contracts/ActionRepoTrackerUp';
import { GameUpgradable } from '../typechain-types/contracts/GameUpgradable';

let actionGUID = "";
let soulTokenId = 1;  //Try to keep track of Current Soul Token ID
const soulTokens: any = {};  //Soul Token Assignment

describe("Protocol", function () {
  //Contract Instances
  let hubContract: HubUpgradable;
  let soulContract: SoulUpgradable;
  let actionContract: ActionRepoTrackerUp;
  let gameContract: GameUpgradable;
  // let unOwnedTokenId: number;

  //Addresses
  let owner: Signer;
  let admin: Signer;
  let admin2: Signer;
  let tester: Signer;
  let tester2: Signer;
  let tester3: Signer;
  let tester4: Signer;
  let tester5: Signer;
  let tester6: Signer;
  let authority: Signer;
  let addrs: Signer[];


  before(async function () {

    //Populate Accounts
    [owner, admin, admin2, tester, tester2, tester3, tester4, tester5, tester6, authority, ...addrs] = await ethers.getSigners();

    //Fetch Addresses
    this.ownerAddr = await owner.getAddress();
    this.adminAddr = await admin.getAddress();
    this.admin2Addr = await admin2.getAddress();
    this.testerAddr = await tester.getAddress();
    this.tester2Addr = await tester2.getAddress();
    this.tester3Addr = await tester3.getAddress();
    this.tester4Addr = await tester4.getAddress();
    this.tester5Addr = await tester5.getAddress();
    this.tester6Addr = await tester6.getAddress();
    this.authorityAddr = await authority.getAddress();


    //--- Deploy Mock ERC20 Token
    this.token = await deployContract("Token", []);
    //Mint 
    this.token.mint(this.ownerAddr, 1000);
    this.token.mint(this.adminAddr, 1000);
    this.token.mint(this.testerAddr, 1000);

    //--- OpenRepo Upgradable (UUPS)
    this.dataRepo = await deployUUPS("OpenRepoUpgradable", []);

    //--- Deploy Hub (UUPS)
    hubContract = await deployHub(this.dataRepo.address);
    
    //--- Rule Repository
    this.ruleRepo = await deployContract("RuleRepo", []);
    //Set to Hub
    await hubContract.assocSet("RULE_REPO", this.ruleRepo.address);

    //Deploy Additional Beacons
    let erc721 = await deployContract("SafeERC721", []);
    hubContract.beaconAdd("ERC721", erc721.address);
    let erc1155 = await deployContract("SafeERC1155", []);
    hubContract.beaconAdd("ERC1155", erc1155.address);

    //--- Deploy All Game Extensions
    deployGameExt(hubContract);
  
    //--- Soul Upgradable (UUPS)
    soulContract = await deployUUPS("SoulUpgradable", [hubContract.address]);
    //Set Avatar Contract to Hub
    await hubContract.assocSet("SBT", soulContract.address);

    //--- History Upgradable (UUPS)
    actionContract = await deployUUPS("ActionRepoTrackerUp", [hubContract.address]);
    //Set History Contract to Hub
    await hubContract.assocSet("action", actionContract.address);

    //Mint SBT for Hub
    await soulContract.mintFor(hubContract.address, "");
    soulTokens.hub = await soulContract.tokenByAddress(hubContract.address);
    ++soulTokenId;

    //--- Votes Repository Upgradable (UUPS)
    this.votesRepo = await deployUUPS("VotesRepoTrackerUp", [hubContract.address]);
    // this.votesRepo = await deployUUPS("VotesRepoTrackerUpInt", [hubContract.address]);
    //Set to Hub
    await hubContract.assocSet("VOTES_REPO", this.votesRepo.address);
        
  });

  describe("OpenRepo", function () {

    it("Should Default to Empty Values", async function () {
      expect(await this.dataRepo.stringGet("TestKey")).to.equal("");
      expect(await this.dataRepo.boolGet("TestKey")).to.equal(false);
      expect(await this.dataRepo.uintGet("TestKey")).to.equal(0);
      expect(await this.dataRepo.addressGet("TestKey")).to.equal(ZERO_ADDR);
    });

    it("Should Store Values", async function () {
      await this.dataRepo.stringSet("TestKey", "string");
      expect(await this.dataRepo.stringGet("TestKey")).to.equal("string");

      await this.dataRepo.boolSet("TestKey", true);
      expect(await this.dataRepo.boolGet("TestKey")).to.equal(true);
      
      await this.dataRepo.uintSet("TestKey", 5);
      expect(await this.dataRepo.uintGet("TestKey")).to.equal(5);
      
      await this.dataRepo.addressSet("TestKey", this.tester4Addr);
      expect(await this.dataRepo.addressGet("TestKey")).to.equal(this.tester4Addr);
    });

  });

  /**
   * Action Repository
   */
    describe("Action Repository", function () {
  
    it("Should store Actions", async function () {
      const action = {
        subject: "founder",     //Accused Role
        verb: "breach",
        object: "contract",
        tool: "",
      };

      // actionGUID = '0xa7440c99ff5cd38fc9e0bff1d6dbf583cc757a83a3424bdc4f5fd6021a2e90e2'; //Wrong GUID
      actionGUID = await actionContract.actionHash(action); //Gets hash if exists or not
      // console.log("actionGUID:", actionGUID);
      let tx = await actionContract.actionAdd(action, test_uri);
      await tx.wait();
      //Expect Added Event
      await expect(tx).to.emit(actionContract, 'ActionAdded').withArgs(1, actionGUID, action.subject, action.verb, action.object, action.tool);
      // await expect(tx).to.emit(actionContract, 'URI').withArgs(actionGUID, test_uri);

      //Fetch Action's Struct
      const actionRet = await actionContract.actionGet(actionGUID);
      
      // console.log("actionGet:", actionRet);
      // expect(Object.values(actionRet)).to.eql(Object.values(action));
      expect(actionRet).to.include.members(Object.values(action));
      // expect(actionRet).to.eql(action);  //Fails
      // expect(actionRet).to.include(action); //Fails
      // expect(actionRet).to.own.include(action); //Fails

      //Additional Rule Data
      expect(await actionContract.actionGetURI(actionGUID)).to.equal(test_uri);
      // expect(await actionContract.actionGetConfirmation(actionGUID)).to.include.members(["authority", true]);    //TODO: Find a better way to check this
    });

  }); //Action Repository

  describe("Soul", function () {
    
    it("Should inherit protocol owner", async function () {
      expect(await soulContract.owner()).to.equal(this.ownerAddr);
    });
    
    it("Can mint", async function () {
      //SBT Tokens
      let tx = await soulContract.connect(tester).mint(test_uri);
      tx.wait();
      //Fetch Token
      let result = await soulContract.ownerOf(soulTokenId);
      //Check Owner
      expect(result).to.equal(this.testerAddr);
      //Check URI
      expect(await soulContract.tokenURI(soulTokenId)).to.equal(test_uri);
      ++soulTokenId;
      
      await soulContract.connect(owner).mint(test_uri);
      soulTokens.owner = await soulContract.tokenByAddress(this.ownerAddr);
      ++soulTokenId;

      await soulContract.connect(admin).mint(test_uri);
      soulTokens.admin = await soulContract.tokenByAddress(this.adminAddr);
      ++soulTokenId;
      
      await soulContract.connect(admin2).mint(test_uri);
      soulTokens.admin2 = await soulContract.tokenByAddress(this.admin2Addr);
      ++soulTokenId;

      await soulContract.connect(tester2).mint(test_uri);
      soulTokens.tester2 = await soulContract.tokenByAddress(this.tester2Addr);
      ++soulTokenId;

      //Mint a Lost-Soul
      await soulContract.mintFor(soulContract.address, test_uri);
      soulTokens.unOwned = soulTokenId;
      ++soulTokenId;
    });

    it("Can mint only one", async function () {
      //Another Mint Call for Same Account Should Fail
      await expect(
        soulContract.connect(tester).mint(test_uri)
      ).to.be.revertedWith("Account already has a token");
    });

    describe("Soul Handle", function () {

      before(async function () {
        this.handle = "tester2Handle";
      });

      it("Can set token handle", async function () {
        let handle = 'firstTry';
        //Set
        let tx = await soulContract.connect(tester2).handleSet(soulTokens.tester2, handle);
        tx.wait();
        //Expected Event
        await expect(tx).to.emit(soulContract, 'SoulHandle').withArgs(soulTokens.tester2, handle);
      });

      it("Can change handle", async function () {
        //Set
        let tx = await soulContract.connect(tester2).handleSet(soulTokens.tester2, this.handle);
        tx.wait();
        //Expected Event
        await expect(tx).to.emit(soulContract, 'SoulHandle').withArgs(soulTokens.tester2, this.handle);
      });

      it("Can set token handle for un-owned tokens", async function () {
        let handle = 'unownedHandle';
        //Set
        let tx = await soulContract.handleSet(soulTokens.unOwned, handle);
        tx.wait();
        //Expected Event
        await expect(tx).to.emit(soulContract, 'SoulHandle').withArgs(soulTokens.unOwned, handle);
      });
      
      it("Can get token by handle", async function () {
        expect(
          await soulContract.handleFind(this.handle)
        ).to.equal(soulTokens.tester2);
      });

      it("Can get handle by token", async function () {
        expect(
          await soulContract.handleGet(soulTokens.tester2)
        ).to.equal(this.handle);
      });

      it("Can't set other's handles", async function () {
        await expect(
          soulContract.connect(tester2).handleSet(soulTokens.admin2, "otherHandle")
        ).to.be.revertedWith("SOUL_NOT_YOURS");
      });
      
      it("Can't set same handle twice", async function () {
        await expect(
          soulContract.connect(admin).handleSet(soulTokens.admin, this.handle)
        ).to.be.revertedWith("HANDLE_TAKEN");
      });

    }); //Soul Handle

    it("Should Index Addresses", async function () {
      //Expected Token ID
      let tokenId = 2;
      //Fetch Token ID By Address
      let result = await soulContract.tokenByAddress(this.testerAddr);
      //Check Token
      expect(result).to.equal(tokenId);
    });

    it("Allow Multiple Owner Accounts per Soul", async function () {
      let miscAddr = await addrs[0].getAddress();
      let tokenId = 2;
      //Fetch Token ID By Address
      let tx = await soulContract.tokenOwnerAdd(miscAddr, tokenId);
      tx.wait();
      //Expected Event
      await expect(tx).to.emit(soulContract, 'Transfer').withArgs(ZERO_ADDR, miscAddr, tokenId);
      //Fetch Token For Owner
      let result = await soulContract.tokenByAddress(miscAddr);
      //Validate
      expect(result).to.equal(tokenId);
    });

    it("Should Post as Owned-Soul", async function () {
      soulTokens.tester = await soulContract.tokenByAddress(this.testerAddr);
      let post = {
        tokenId: soulTokens.tester,
        uri:test_uri,
        context: '',
      };

      //Validate Permissions
      await expect(
        //Failed Post
        soulContract.connect(tester4).announcement(post.tokenId, post.uri, post.context)
      ).to.be.revertedWith("POST:SOUL_NOT_YOURS");

      //Successful Post
      let tx = await soulContract.connect(tester).announcement(post.tokenId, post.uri, post.context);
      await tx.wait();  //wait until the transaction is mined
      //Expect Event
      await expect(tx).to.emit(soulContract, 'Announcement').withArgs(this.testerAddr, post.tokenId, post.uri, post.context);
    });

    it("Can add other people (lost-souls)", async function () {
      //Fetch Token
      let result = await soulContract.ownerOf(soulTokens.unOwned);
      //Check Owner
      expect(result).to.equal(await soulContract.address);
      //Check URI
      expect(await soulContract.tokenURI(soulTokens.unOwned)).to.equal(test_uri);
    });

    it("Owner can post as a lost-soul", async function () {
      let post = {
        tokenId: soulTokens.unOwned,
        uri: test_uri,
        context: soulContract.address,
      };
      //Validate Permissions
      await expect(
        //Failed Post
        soulContract.connect(tester4).announcement(post.tokenId, post.uri, post.context)
      ).to.be.revertedWith("POST:SOUL_NOT_YOURS");
      //Successful Post
      let tx = await soulContract.announcement(post.tokenId, post.uri, post.context);
      await tx.wait();  //wait until the transaction is mined
      //Expect Event
      await expect(tx).to.emit(soulContract, 'Announcement').withArgs(this.ownerAddr, post.tokenId, post.uri, post.context);
    });
    
    // it("[TBD] Should Merge Souls", async function () {

    // });
    
    it("Tokens should NOT be transferable", async function () {
      //Should Fail to transfer -- "SOUL:NON_TRANSFERABLE"
      await expect(
        soulContract.connect(tester).transferFrom(this.testerAddr, this.tester2Addr, soulTokens.tester)
      ).to.be.revertedWith("SOUL:NON_TRANSFERABLE");
    });

    it("Can update token's metadata", async function () {
      let test_uri = "TEST_URI_UPDATED";
      //Update URI
      await soulContract.connect(tester).update(soulTokens.tester, test_uri);
      //Check URI
      expect(await soulContract.connect(tester).tokenURI(soulTokens.tester)).to.equal(test_uri);
    });

    it("Should register soul's opinion change", async function () {
      //Rep Call Data      
      let repCall = { tokenId:1, domain:"personal", score:2};
      soulContract.connect(tester).opinionAboutSoul(repCall.tokenId, repCall.domain, repCall.score);
    });
    
  }); //Soul

  /**
   * Game Contract
   */
  describe("Game", function () {
    
    before(async function () {
      //Mint Souls for Participants
      await soulContract.connect(tester4).mint(test_uri);
      await soulContract.connect(tester5).mint(test_uri);
      await soulContract.connect(authority).mint(test_uri);
      soulTokenId += 3;
      let game = {
        name: "Test Game",
        type: "",
      };

      //Simulate to Get New Game Address
      let gameAddr = await hubContract.callStatic.makeGame(game.type, game.name, test_uri);
      //Create New Game
      let tx = await hubContract.makeGame(game.type, game.name, test_uri);
      //Expect Valid Address
      expect(gameAddr).to.be.properAddress;
      //Expect Claim Created Event
      await expect(tx).to.emit(hubContract, 'ContractCreated').withArgs("game", gameAddr);
      await expect(tx).to.emit(soulContract, 'SoulType').withArgs(soulTokenId, "GAME");
      await expect(tx).to.emit(this.dataRepo, 'StringSet').withArgs(gameAddr, "type", game.type);
      await expect(tx).to.emit(this.dataRepo, 'StringSet').withArgs(gameAddr, "role", game.type);

      // const receipt = await tx.wait()
      // console.log("makeGame Logs: ", receipt.logs);
      // console.log("makeGame Events: ", receipt.events);
      // console.log("makeGame Event count: ", receipt.events.length);
      // console.log("Repo Addr: ", this?.openRepo?.address); //V

      // console.log("Current soulTokenId", soulTokenId);
      ++soulTokenId;
      //Init Game Contract Object
      gameContract = await ethers.getContractFactory("GameUpgradable").then(res => res.attach(gameAddr)) as GameUpgradable;
      this.gameContract = gameContract;

      expect(await this.gameContract.confGet("type")).to.equal(game.type);
      expect(await this.gameContract.confGet("role")).to.equal(game.type);
    });

    it("Should Update Contract URI", async function () {
      //Before
      expect(await this.gameContract.contractURI()).to.equal(test_uri);
      //Change
      await this.gameContract.setContractURI(test_uri2);
      //After
      expect(await this.gameContract.contractURI()).to.equal(test_uri2);
    });

    it("Users can join as a member", async function () {
      //Check Before
      expect(await this.gameContract.roleHas(this.testerAddr, "member")).to.equal(false);
      //Join Game
      await this.gameContract.connect(tester).join();
      //Check After
      expect(await this.gameContract.roleHas(this.testerAddr, "member")).to.equal(true);
    });
    
    it("Role Should Track Soul's Owner", async function () {
      //Check Before
      expect(await this.gameContract.roleHas(this.tester5Addr, "member")).to.equal(false);
      // expect(await this.gameContract.roleHas(this.tester5Addr, "member")).to.equal(false);
      //Join Game
      await this.gameContract.connect(tester5).join();
      //Check
      expect(await this.gameContract.roleHas(this.tester5Addr, "member")).to.equal(true);
      //Get Tester5's Soul TokenID
      let tokenId = await soulContract.tokenByAddress(this.tester5Addr);
      // console.log("Tester5 Soul Token ID: ", tokenId);
      //Move Soul Token to Tester3
      let tx = await soulContract.transferFrom(this.tester5Addr, this.tester3Addr, tokenId);
      await tx.wait();
      await expect(tx).to.emit(soulContract, 'Transfer').withArgs(this.tester5Addr, this.tester3Addr, tokenId);
      //Expect Change of Ownership
      expect(await soulContract.ownerOf(tokenId)).to.equal(this.tester3Addr);
      //Check Membership
      expect(await this.gameContract.roleHas(this.tester3Addr, "member")).to.equal(true);
      // expect(await this.gameContract.roleHas(this.tester5Addr, "member")).to.equal(false);

      //Should Fail - No Soul For Contract
      // await expect(
      //   this.gameContract.roleHas(this.tester5Addr, "member")
      // ).to.be.revertedWith("ERC1155Tracker: requested account not found on source contract");
      //Should Not Fail. 0/False if does not exist
      expect(await this.gameContract.roleHas(this.tester5Addr, "member")).to.equal(false);
    });

    it("Users can leave", async function () {
      //Check Before
      expect(await this.gameContract.roleHas(this.testerAddr, "member")).to.equal(true);
      //Join Game
      await this.gameContract.connect(tester).leave();
      //Check After
      expect(await this.gameContract.roleHas(this.testerAddr, "member")).to.equal(false);
    });

    it("Owner can appoint Admin", async function () {
      //Check Before
      expect(await this.gameContract.roleHas(this.adminAddr, "admin")).to.equal(false);
      //Should Fail - Require Permissions
      await expect(
        this.gameContract.connect(tester).roleAssign(this.adminAddr, "admin", 1)
      ).to.be.revertedWith("INVALID_PERMISSIONS");
      //Assign Admin
      await this.gameContract.roleAssign(this.adminAddr, "admin", 1);
      //Check After
      expect(await this.gameContract.roleHas(this.adminAddr, "admin")).to.equal(true);
    });

    it("Admin can appoint authority", async function () {
      //Check Before
      expect(await this.gameContract.roleHas(this.authorityAddr, "authority")).to.equal(false);
      //Should Fail - Require Permissions
      await expect(
        this.gameContract.connect(tester2).roleAssign(this.authorityAddr, "authority", 1)
      ).to.be.revertedWith("INVALID_PERMISSIONS");
      //Assign Authority
      await this.gameContract.connect(admin).roleAssign(this.authorityAddr, "authority", 1);
      //Check After
      expect(await this.gameContract.roleHas(this.authorityAddr, "authority")).to.equal(true);
    });
    
    it("Admin can Create New Roles", async function () {
      const newRoles = [{name:"NewRole1", uri:"NewURI1"}, {name:"NewRole2", uri:"NewURI2"}];

      await this.gameContract.connect(admin).roleCreate(newRoles[0].name);
      //No Duplicates
      await expect(
        this.gameContract.connect(admin).roleCreate(newRoles[0].name)
      ).to.be.reverted;

      await this.gameContract.connect(admin).roleMake(newRoles[1].name, newRoles[1].uri);
      //No Duplicates
      await expect(
        this.gameContract.connect(admin).roleMake(newRoles[1].name, newRoles[1].uri)
      ).to.be.reverted;
      //Validate URI      
      expect(await this.gameContract.roleURI(newRoles[1].name)).to.equal(newRoles[1].uri);

    });
    
    it("Admin can Assign Roles to Lost-Souls", async function () {
      //Check Before
      expect(await this.gameContract.roleHasByToken(soulTokens.unOwned, "authority")).to.equal(false);
      //Assign Authority
      await this.gameContract.connect(admin).roleAssignToToken(soulTokens.unOwned, "authority", 1)
      //Check After
      expect(await this.gameContract.roleHasByToken(soulTokens.unOwned, "authority")).to.equal(true);
    });
    
    /* ERC1155 Tracker is now using Using ERC1155TrackerUpMin which doesn't have transfer functions
    it("Should NOT be transferable", async function () {
      let authTokenId = await this.gameContract.roleToId("authority");
      console.log('authTokenId:', authTokenId, this.authorityAddr, this.testerAddr, authTokenId, 1, '');
      // authTokenId: BigNumber { value: "3" } 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f 0x90F79bf6EB2c4f870365E785982E1f101E93b906 BigNumber { value: "3" } 1 
      
      // const newGameContract = await ethers.getContractFactory("ERC1155").then(res => res.attach(this.gameContract.address));

      //Should Fail to transfer -- "SOUL:NON_TRANSFERABLE"
      await expect(
        this.gameContract.connect(authority).safeTransferFrom(this.authorityAddr, this.testerAddr, authTokenId, 1, '')
      ).to.be.revertedWith("SOUL:NON_TRANSFERABLE");
    });
    */

    it("Can change Roles (Promote / Demote)", async function () {
      //Check Before
      expect(await this.gameContract.roleHas(this.tester4Addr, "admin")).to.equal(false);
      //Join Game
      let tx = await this.gameContract.connect(tester4).join();
      await tx.wait();
      //Check Before
      expect(await this.gameContract.roleHas(this.tester4Addr, "member")).to.equal(true);
      //Upgrade to Admin
      await this.gameContract.roleChange(this.tester4Addr, "member", "admin", 1);
      //Check After
      expect(await this.gameContract.roleHas(this.tester4Addr, "admin")).to.equal(true);
    });
    
    it("Should store Rules", async function () {
      // let actionGUID = '0xa7440c99ff5cd38fc9e0bff1d6dbf583cc757a83a3424bdc4f5fd6021a2e90e2';//await actionContract.callStatic.actionAdd(action);
      const confirmation = {
        ruling: "authority",  //Decision Maker
        evidence: true, //Require Evidence
        quorum: 1,  //Minimal number of witnesses
      };
      const rule = {
        // uint256 about;    //About What (Token URI +? Contract Address)
        about: actionGUID, //"0xa7440c99ff5cd38fc9e0bff1d6dbf583cc757a83a3424bdc4f5fd6021a2e90e2",
        affected: "investor",  //Beneficiary
        // string uri;     //Text, Conditions & additional data
        uri: "ADDITIONAL_DATA_URI",
        // bool negation;  //false - Commision  true - Omission
        negation: false,
      };
      // Effect Object (Describes Changes to Rating By Type)
      const effects1 = [
        {domain:'professional', value:5,},
        {domain:'social', value:5,},
      ];
      const rule2 = {
        // uint256 about;    //About What (Token URI +? Contract Address)
        about: actionGUID, //"0xa7440c99ff5cd38fc9e0bff1d6dbf583cc757a83a3424bdc4f5fd6021a2e90e2",
        affected: "god",  //Beneficiary
        // string uri;     //Text, Conditions & additional data
        uri: "ADDITIONAL_DATA_URI",
        // bool negation;  //false - Commision  true - Omission
        negation: false,
      };
      // Effect Object (Describes Changes to Rating By Type)
      const  effects2 = [
        {domain:'environmental', value:10,},
        {domain:'personal', value:4,},
      ];
      
      //Add Rule
      const tx = await this.gameContract.connect(admin).ruleAdd(rule, effects1, confirmation);      
      // wait until the transaction is mined
      await tx.wait();
      // const receipt = await tx.wait()
      // console.log("Rule Added", receipt.logs);
      // console.log("Rule Added Events: ", receipt.events);

      //Expect Event
      await expect(tx).to.emit(this.ruleRepo, 'Rule').withArgs(this.gameContract.address, 1, rule.about, rule.affected, rule.uri, rule.negation);
      
      for(let effect of effects1) {
        //Expect Effects
        await expect(tx).to.emit(this.ruleRepo, 'RuleEffect').withArgs(this.gameContract.address, 1, effect.domain, effect.value);
      }
      //Expect Confirmation
      await expect(tx).to.emit(this.ruleRepo, 'Confirmation').withArgs(this.gameContract.address, 1, confirmation.ruling, confirmation.evidence, confirmation.quorum);

      //Add Another Rule
      let tx2 = await this.gameContract.connect(admin).ruleAdd(rule2, effects2, confirmation);
      
      //Expect Event
      await expect(tx2).to.emit(this.ruleRepo, 'Rule').withArgs(this.gameContract.address, 2, rule2.about, rule2.affected, rule2.uri, rule2.negation);
      await expect(tx2).to.emit(this.ruleRepo, 'Confirmation').withArgs(this.gameContract.address, 2, confirmation.ruling, confirmation.evidence, confirmation.quorum);

      // console.log("Rule Getter:", typeof ruleData, ruleData);   //some kind of object array crossbread
      // console.log("Rule Getter Effs:", ruleData.effects);  //V
      // console.log("Rule Getter:", JSON.stringify(ruleData)); //As array. No Keys
      
      // await expect(ruleData).to.include.members(Object.values(rule));
    });

    it("The Soulless Can Create a New Game", async function () {
      //Deploy a New Game
      const game = {name: "Soulless Project", type: "PROJECT"};
      await hubContract.connect(addrs[0]).makeGame(game.type, game.name, test_uri);
      //Deploy new SafeERC Contracts
      await hubContract.connect(addrs[1]).makeERC721("NAME", "SYMBOL", "URI721");
      await hubContract.connect(addrs[2]).makeERC1155("URI1155");
    });

    it("Should Update Rule", async function () {
      const actionGUID = '0xa7440c99ff5cd38fc9e0bff1d6dbf583cc757a83a3424bdc4f5fd6021a2e90e2';
      const ruleId = 2;
      const rule = {
        about: actionGUID, //"0xa7440c99ff5cd38fc9e0bff1d6dbf583cc757a83a3424bdc4f5fd6021a2e90e2",
        affected: "god",  //Beneficiary
        uri: "ADDITIONAL_DATA_URI",
        negation: false,
      };
      const effects = [
        {domain:'environmental', value:1},
        {domain:'personal', value:1},
      ];
      const conditions = [
        { repo: 'action', id:actionGUID },
      ];
      const confirmation = {
        ruling: "admin",  //Decision Maker
        evidence: false, //Require Evidence
        quorum: 1,  //Minimal number of witnesses
      };

      await this.gameContract.connect(admin).ruleUpdateEffects(ruleId, effects);
      const curEffects = await this.gameContract.effectsGet(ruleId);
      // console.log("Effects", curEffects);
      expect(curEffects).to.include.keys(Object.keys(effects));
      // expect(curEffects).to.include.members(effects);    //Doesn't Work...

      await this.gameContract.connect(admin).ruleUpdateConditions(ruleId, conditions);
      const curConds = await this.gameContract.conditionsGet(ruleId);
      // console.log("Conditions:", curConds);
      expect(curConds).to.include.keys(Object.keys(conditions));
      // expect(curConds).to.have.members([conditions[0].repo, conditions[0].id]);  //In an Array...

      await this.gameContract.connect(admin).ruleUpdateConfirmation(ruleId, confirmation);
      const curConfirmation = await this.gameContract.confirmationGet(ruleId);
      expect(curConfirmation).to.include.keys(Object.keys(confirmation));
      expect(curConfirmation).to.include.members([confirmation.ruling,confirmation.evidence]);
    });

    it("Should Write a Post", async function () {
      let post = {
        entRole:"member",
        tokenId: soulTokens.tester,
        uri:test_uri,
      };

      //Join Game
      let tx1 = await this.gameContract.connect(tester).join();
      await tx1.wait();
      //Make Sure Account Has Role
      expect(await this.gameContract.roleHas(this.testerAddr, "member")).to.equal(true);

      //Validate Permissions
      await expect(
        //Failed Post
        this.gameContract.connect(tester4).post(post.entRole, post.tokenId, post.uri)
      ).to.be.revertedWith("POST:SOUL_NOT_YOURS");

      //Successful Post
      let tx2 = await this.gameContract.connect(tester).post(post.entRole, post.tokenId, post.uri);
      await tx2.wait();  //wait until the transaction is mined
      //Expect Event
      await expect(tx2).to.emit(this.gameContract, 'Post').withArgs(this.testerAddr, post.tokenId, post.entRole, post.uri);
    });
    
    it("Should Update Membership Token URI", async function () {
      //Protected
      await expect(
        this.gameContract.connect(tester3).setRoleURI("admin", test_uri)
      ).to.be.revertedWith("INVALID_PERMISSIONS");
      //Set Admin Token URI
      await this.gameContract.connect(admin).setRoleURI("admin", test_uri);
      //Validate
      expect(await this.gameContract.roleURI("admin")).to.equal(test_uri);
    });

    describe("Closed Game", function () {

      it("Can Close Game", async function () {
        //Change to Closed Game
        let tx = await this.gameContract.connect(admin).confSet("isClosed", "true");
        //Expect Claim Created Event
        await expect(tx).to.emit(this.dataRepo, 'StringSet').withArgs(this.gameContract.address, "isClosed", "true");
        //Validate
        expect(await this.gameContract.confGet("isClosed")).to.equal("true");
      });

      it("Should Fail to Join Game", async function () {
        //Validate Permissions
        await expect(
          this.gameContract.connect(tester4).join()
        ).to.be.revertedWith("CLOSED_SPACE");
      });
      
      it("Can Apply to Join", async function () {
        //Apply to Join Game
        let tx = await this.gameContract.connect(tester).nominate(soulTokens.tester, test_uri);
        await tx.wait();
        //Expect Event
        await expect(tx).to.emit(this.gameContract, 'Nominate').withArgs(this.testerAddr, soulTokens.tester, test_uri);
      });

      it("Can Re-Open Game", async function () {
        //Change to Closed Game
        await this.gameContract.connect(admin).confSet("isClosed", "false");
        //Validate
        expect(await this.gameContract.confGet("isClosed")).to.equal("false");
      });
      
    }); //Closed Game

    
    it("Should Report Event", async function () {
      let eventData = {
        ruleId: 1,
        account: this.tester2Addr,
        uri: test_uri,
      };
      
      //Report Event
      let tx = await this.gameContract.connect(authority).reportEvent(eventData.ruleId, eventData.account, eventData.uri);

      // const receipt = await tx.wait();
      // console.log("Rule Added", receipt.logs);
      // console.log("Rule Added Events: ", receipt.events);

      //Validate
      await expect(tx).to.emit(this.gameContract, 'EffectsExecuted').withArgs(soulTokens.tester2, eventData.ruleId, "0x");
    });
    
    describe("Game Extensions", function () {

      it("Should Set DAO Extension Contract", async function () {
        //Deploy Extensions
        let dummyContract1 = await deployContract("Dummy", []);
        let dummyContract2 = await deployContract("Dummy2", []);
        //Set DAO Extension Contract
        await hubContract.assocAdd("GAME_DAO", dummyContract1.address);
        await hubContract.assocAdd("GAME_DAO", dummyContract2.address);
      });

      it("Should Set Game Type", async function () {
        //Change Game Type
        await this.gameContract.connect(admin).confSet("type", "DAO");
        //Validate
        expect(await this.gameContract.confGet("type")).to.equal("DAO");
      });

      it("Should Fallback to Extension Function", async function () {
        this.daoContract = await ethers.getContractFactory("Dummy2").then(res => res.attach(this.gameContract.address));
        this.daoContract2 = await ethers.getContractFactory("Dummy2").then(res => res.attach(this.gameContract.address));
        //First Dummy        
        expect(await await this.daoContract.debugFunc()).to.equal("Hello World Dummy");
        //Second Dummy
        expect(await await this.daoContract2.debugFunc2()).to.equal("Hello World Dummy 2");
        //Second Dummy Extracts Data from Main Game Contract
        expect(await await this.daoContract2.useSelf()).to.equal("Game Symbol: GAME");
      });

    }); //Game Extensions
    
  }); //Game

  /**
   * Projects Flow
   */
  describe("Project Game Flow", function () {

    before(async function () {
      //-- Deploy a new Game:MicroDAO
      let gameMDAOData = {name: "Test mDAO", type: "MDAO"};
      //Simulate to Get New Game Address
      let gameMDAOAddr = await hubContract.connect(admin2).callStatic.makeGame(gameMDAOData.type, gameMDAOData.name, test_uri);
      // let gameAddr = await hubContract.callStatic.makeGame(game.type, game.name, test_uri);
      //Create New Game
      await hubContract.connect(admin2).makeGame(gameMDAOData.type, gameMDAOData.name, test_uri);
      // await hubContract.makeGame(game.type, game.name, test_uri);
      ++soulTokenId;

      // await expect(tx1).to.emit(this.dataRepo, 'StringSet').withArgs("type", gameMDAOData.type);
      // await expect(tx1).to.emit(this.dataRepo, 'StringSet').withArgs("role", gameMDAOData.type);

      //Init Game Contract Object
      this.mDAOGameContract = await ethers.getContractAt('GameUpgradable', gameMDAOAddr);

      //Attach Project Functionality
      this.mDAOContract = await ethers.getContractAt('MicroDAOExt', gameMDAOAddr);

      //Attach Project Functionality
      this.mDAOFundsContract = await ethers.getContractAt('FundManExt', gameMDAOAddr);

      //-- Deploy Project Game Extension
      let projectExtContract = await deployContract("ProjectExt", []);
      //Set Project Extension Contract
      await hubContract.assocAdd("GAME_PROJECT", projectExtContract.address);

      //-- Deploy a new Game:Project        
      let game = {name: "Test Project", type: "PROJECT"};
      //Simulate to Get New Game Address
      let gameProjAddr = await hubContract.connect(admin).callStatic.makeGame(game.type, game.name, test_uri);
      //Create New Game
      await hubContract.connect(admin).makeGame(game.type, game.name, test_uri);
      ++soulTokenId;
      
      // await expect(tx2).to.emit(this.dataRepo, 'StringSet').withArgs("type", game.type);
      // await expect(tx2).to.emit(this.dataRepo, 'StringSet').withArgs("role", game.type);

      //Init Game Contract Object
      this.projectGameContract = await ethers.getContractAt('GameUpgradable', gameProjAddr);
      //Attach Project Functionality
      this.projectContract = await ethers.getContractAt('ProjectExt', gameProjAddr);

      //Soul Tokens
      soulTokens.mDAO1 = await soulContract.tokenByAddress(gameMDAOAddr);
      soulTokens.proj1 = await soulContract.tokenByAddress(gameProjAddr);
      // console.log("[DEBUG] mDAO is:", soulTokens.mDAO1, gameMDAOAddr);
    });

    it("Game Should be of Type:PROJECT", async function () {
      //Validate
      expect(await this.projectGameContract.confGet("type")).to.equal("PROJECT");
    });

    it("Project Should Create a Task ", async function () {
      let value = 100; //ethers.utils.parseEther(0.001);
      let taskData = {type:"bounty", name: "Test Task", uri: test_uri2};
      let taskAddr = await this.projectContract.connect(admin).callStatic.makeTask(taskData.type, taskData.name, taskData.uri);
      // this.projectContract.connect(admin).makeTask(taskData.name, taskData.uri);
      await this.projectContract.connect(admin).makeTask(taskData.type, taskData.name, taskData.uri, {value}); //Fund on Creation
      //Attach
      // this.task1 = await ethers.getContractAt('TaskUpgradable', taskAddr, admin);
      this.task1 = await ethers.getContractAt('TaskUpgradable', taskAddr);
    });

    it("TODO: Project Should Update a Task (Soul) ", async function () {
    
    });

    it("Should Fund Task (ETH)", async function () {
      let curBalance = await this.task1.contractBalance(ZERO_ADDR);
      let value = 100; //ethers.utils.parseEther(0.001);
      //Sent Native Tokens
      await admin.sendTransaction({to: this.task1.address, value});
      //Validate Balance
      expect(await this.task1.contractBalance(ZERO_ADDR))
        .to.equal(curBalance.add(value));
    });

    it("Should Fund Task (ERC20)", async function () {
      await this.token.connect(admin).transfer(this.task1.address, 1);
      //Verify Transfer
      expect(await this.token.balanceOf(this.task1.address))
        .to.equal(1);
      expect(await this.task1.contractBalance(this.token.address))
        .to.equal(1);
    });

    it("Should Apply to Project (as Individual)", async function () {
      /// Apply (Nominate Self)
      let tx = await this.task1.connect(tester).application(test_uri);
      //Expect Event
      await expect(tx).to.emit(this.task1, 'Nominate').withArgs(this.testerAddr, soulTokens.tester, test_uri);
    });

    it("Should Apply to Project (as mDAO)", async function () {
      /// Apply (Nominate Self)
      let tx = await this.mDAOContract.connect(admin2).applyToTask(this.task1.address, test_uri);
      //Expect Event
      await expect(tx).to.emit(this.task1, 'Nominate').withArgs(this.mDAOContract.address, soulTokens.mDAO1, test_uri);
    });

    /// TODO: Reject Applicant (Jusdt Ignore for now / dApp Function)
    // it("Should Reject Applicant", async function () { });

    /// Accept Application (Assign Role)
    it("Should Accept mDAO as Applicant", async function () {
      //Should Fail - Require Permissions
      await expect(
        this.task1.connect(tester).acceptApplicant(soulTokens.mDAO1)
      ).to.be.revertedWith("INVALID_PERMISSIONS");
      //Accept Applicant (to Role)
      await this.task1.connect(admin).acceptApplicant(soulTokens.mDAO1);
      //Validate
      expect(await this.task1.roleHasByToken(soulTokens.mDAO1, "applicant")).to.equal(true);
    });

    /// Deliver a Task
    it("Should Post a Delivery (as mDAO)", async function () {
      let post = {taskAddr: this.task1.address, uri: test_uri2};
      //Validate Permissions
      await expect(
        this.mDAOContract.connect(tester4).deliverTask(post.taskAddr, post.uri)
      // ).to.be.revertedWith("ADMIN_ONLY");  //Would work once the proxy returns errors
      ).to.be.reverted;
      /// Apply (Nominate Self)
      let tx = await this.mDAOContract.connect(admin2).deliverTask(post.taskAddr, post.uri);
      //Expect Event
      await expect(tx).to.emit(this.task1, 'Post').withArgs(this.admin2Addr, soulTokens.mDAO1, "applicant", test_uri2);
    });

    /// Reject Delivery / Request for Changes
    it("Should Reject Delivery / Request for Changes (with a message)", async function () {
      await this.task1.connect(admin).deliveryReject(soulTokens.mDAO1, test_uri2);
    });
    
    /// Approve Delivery (Close Case w/Positive Verdict)
    it("Should Apporove Delivery", async function () {
      //Should Fail - Require Permissions
      await expect(
        this.task1.connect(tester).deliveryApprove(soulTokens.mDAO1, 1)
      ).to.be.revertedWith("INVALID_PERMISSIONS");
      //Accept Applicant (to Role)
      await this.task1.connect(admin).deliveryApprove(soulTokens.mDAO1, 1);
      //Check After
      expect(await this.task1.roleHasByToken(soulTokens.mDAO1, "subject")).to.equal(true);
    });

    /// Disburse funds to participants
    it("Should Disburse funds to winner(s)", async function () {
      let balanceBefore:any = {};
      balanceBefore.native = await this.task1.contractBalance(ZERO_ADDR);
      balanceBefore.token = await this.task1.contractBalance(this.token.address);
      // console.log("Before Token Balance", balanceBefore);
      //Execute with Token Relevant Contract Addresses
      await this.task1.connect(admin).stageExecusion([this.token.address]);
      //Check mDAO Balance
      // expect(await this.token.balanceOf(this.mDAOContract.address))
      expect(await this.mDAOFundsContract.contractBalance(this.token.address))
        .to.equal(balanceBefore.token);
      expect(await this.mDAOFundsContract.contractBalance(ZERO_ADDR))
        .to.equal(balanceBefore.native);
    });

    /// Disburse funds to participants
    it("[TODO] Should Disburse additional late-funds to winner(s)", async function () {
      //Send More

      //Disbures
      await this.task1.connect(admin).disburse([this.token.address]);

      //Validate

    });

    /**
      * Projects Flow
      */
    describe("Project Game Flow (Cancellation)", function () {

      before(async function () {

      });

      it("Project Should Create a new Task ", async function () {
        let value = 100; //ethers.utils.parseEther(0.001);
        let taskData = {type: "bounty", name: "Test Task", uri: test_uri2};
        let taskAddr = await this.projectContract.connect(admin).callStatic.makeTask(taskData.type, taskData.name, taskData.uri);
        // this.projectContract.connect(admin).makeTask(taskData.type, taskData.name, taskData.uri);
        this.projectContract.connect(admin).makeTask(taskData.type, taskData.name, taskData.uri, {value}); //Fund on Creation
        //Attach
        this.task2 = await ethers.getContractFactory("TaskUpgradable").then(res => res.attach(taskAddr));
        // this.task2 = await ethers.getContractAt('TaskUpgradable', taskAddr);
        // this.task2Procedure = await ethers.getContractFactory("IProcedure").then(res => res.attach(taskAddr));
        this.task2Procedure = await ethers.getContractAt('Procedure', taskAddr, admin);
      });
      
      it("Should Fund Task (ETH)", async function () {
        let curBalance = await this.task2.contractBalance(ZERO_ADDR);
        let value = 100; //ethers.utils.parseEther(0.001);
        //Sent Native Tokens
        await admin.sendTransaction({to: this.task2.address, value});
        //Validate Balance
        expect(await this.task2.contractBalance(ZERO_ADDR))
          .to.equal(curBalance.add(value));
      });

      it("Should Fund Task (ERC20)", async function () {
        await this.token.transfer(this.task2.address, 1);
        //Verify Transfer
        expect(await this.token.balanceOf(this.task2.address))
          .to.equal(1);
        expect(await this.task2.contractBalance(this.token.address))
          .to.equal(1);
      });

      it("Should Cancel Task", async function () { 
        let balanceBefore:any = {};
        balanceBefore.native = await this.task2.contractBalance(ZERO_ADDR);
        balanceBefore.token = await this.task2.contractBalance(this.token.address);
        let balanceAdminBefore:any = {};
        balanceAdminBefore.native = await admin.getBalance();
        balanceAdminBefore.token = await this.token.balanceOf(this.adminAddr);
        // console.log("Balance Before", balanceBefore, balanceAdminBefore);

        //Cancel Task
        let tx = await this.task2.connect(admin).cancel(test_uri, [this.token.address]);
        await expect(tx).to.emit(this.task2Procedure, 'Cancelled').withArgs(test_uri, this.adminAddr);
        //Expect Refund & Check Task Creator's Balance
        expect(await this.token.balanceOf(this.adminAddr)).to.equal(balanceAdminBefore.token.add(balanceBefore.token));
        // expect(await admin.getBalance()).to.equal( balanceAdminBefore.native.add(balanceBefore.native) );  //...Gas?
      });

      /// Deposit (Anyone can send funds at any point)
      it("Should Support Deposits at any time", async function () {
        let curBalance = await this.task2.contractBalance(ZERO_ADDR);
        let value = 100; //ethers.utils.parseEther(0.001);

        //Sent Native Tokens
        await admin.sendTransaction({to: this.task2.address, value});
        //Validate Balance
        expect(await this.task2.contractBalance(ZERO_ADDR))
          .to.equal(curBalance.add(value));

        await this.token.connect(admin).transfer(this.task2.address, 1);
        //Verify Transfer
        expect(await this.token.balanceOf(this.task2.address))
          .to.equal(1);
        expect(await this.task2.contractBalance(this.token.address))
          .to.equal(1);

      });

      it("Should Not Disburse Yet", async function () {
          await expect(
            this.task2.connect(admin).disburse([this.token.address])
          ).to.be.revertedWith("NO_WINNERS_PICKED");
      });

      it("Should Refund Toknes to Task Creator", async function () {
        let balanceBefore:any = {};
        balanceBefore.native = await this.task2.contractBalance(ZERO_ADDR);
        balanceBefore.token = await this.task2.contractBalance(this.token.address);
        let balanceAdminBefore:any = {};
        balanceAdminBefore.native = await admin.getBalance();
        balanceAdminBefore.token = await this.token.balanceOf(this.adminAddr);
        // console.log("Balance Before", balanceBefore, balanceAdminBefore);

        /// Refund -- Send Tokens back to Task Creator
        let tx = await this.task2.connect(admin).refund([this.token.address]);
        //Expect Refund & Check Task Creator's Balance
        expect(await this.token.balanceOf(this.adminAddr)).to.equal(balanceAdminBefore.token.add(balanceBefore.token));
        // expect(await admin.getBalance()).to.equal( balanceAdminBefore.native.add(balanceBefore.native) );  //...Gas?
      });

    }); //Cancelled Task Flow


  

  /**
   * Court Flow
   */
    describe("Court Game Flow", function () {

      before(async function () {
        //Attach Court Functionality
        this.courtContract = await ethers.getContractFactory("CourtExt").then(res => res.attach(gameContract.address));
      });
      
      it("Should Set COURT Extension Contract", async function () {
        //Change Game Type to Court
        await gameContract.connect(admin).confSet("type", "COURT");
        //Validate
        expect(await gameContract.confGet("type")).to.equal("COURT");
      });

      it("Should be Created (by Game)", async function () {
        //Soul Tokens
        soulTokens.admin = await soulContract.tokenByAddress(this.adminAddr);
        soulTokens.tester3 = await soulContract.tokenByAddress(this.tester3Addr);
      
        let claimName = "Test Claim #1";
        let ruleRefArr = [
          {
            game: gameContract.address, 
            ruleId: 1,
          }
        ];
        let roleRefArr = [
          {
            role: "subject",
            tokenId: soulTokens.tester2,
          },
          {
            role: "affected",
            // tokenId: soulTokens.unOwned, //TODO: Try This
            tokenId: soulTokens.tester3,
          },
        ];
        let posts = [
          {
            tokenId: soulTokens.admin, 
            entRole: "admin",
            uri: test_uri,
          }
        ];

        //Join Game (as member)
        await gameContract.connect(admin).join();
        //Assign Admin as Member
        // await gameContract.roleAssign(this.adminAddr, "member");

        //Simulate - Get New Claim Address
        let claimAddr = await this.courtContract.connect(admin).callStatic.caseMake(claimName, test_uri, ruleRefArr, roleRefArr, posts);
        // console.log("New Claim Address: ", claimAddr);

        //Create New Claim
        let tx = await this.courtContract.connect(admin).caseMake(claimName, test_uri, ruleRefArr, roleRefArr, posts);
        //Expect Valid Address
        expect(claimAddr).to.be.properAddress;

        //Init Claim Contract
        // this.claimContract = await ethers.getContractFactory("ClaimUpgradable").then(res => res.attach(claimAddr));
        this.claimContract = await ethers.getContractAt('ClaimUpgradable', claimAddr);

        //Expect Claim Created Event
        // await expect(tx).to.emit(gameContract, 'ClaimCreated').withArgs(1, claimAddr);   //DEPRECATED
        // await expect(tx).to.emit(hubContract, 'ContractCreated').withArgs("claim", claimAddr);
        await expect(tx).to.emit(hubContract, 'ContractCreated').withArgs("process", claimAddr);
        
        //Expect Post Event
        await expect(tx).to.emit(this.claimContract, 'Post').withArgs(this.adminAddr, posts[0].tokenId, posts[0].entRole, posts[0].uri);
      });
      
      it("Should be Created & Opened (by Game)", async function () {
        let claimName = "Test Claim #1";
        let ruleRefArr = [
          {
            game: gameContract.address, 
            ruleId: 1,
          }
        ];
        let roleRefArr = [
          {
            role: "subject",
            tokenId: soulTokens.tester2,
          },
          {
            role: "witness",
            tokenId: soulTokens.tester3,
          }
        ];
        let posts = [
          {
            tokenId: soulTokens.admin, 
            entRole: "admin",
            uri: test_uri,
          }
        ];
        //Simulate - Get New Claim Address
        let claimAddr = await this.courtContract.connect(admin).callStatic.caseMakeOpen(claimName, test_uri, ruleRefArr, roleRefArr, posts);
        //Create New Claim
        let tx = await this.courtContract.connect(admin).caseMakeOpen(claimName, test_uri, ruleRefArr, roleRefArr, posts);
        //Expect Valid Address
        expect(claimAddr).to.be.properAddress;
        //Init Claim Contract
        let claimContract = await ethers.getContractFactory("ClaimUpgradable").then(res => res.attach(claimAddr));
        
        //Expect Claim Created Event
        // await expect(tx).to.emit(gameContract, 'ClaimCreated').withArgs(2, claimAddr); //DEPRECATED
        // await expect(tx).to.emit(hubContract, 'ContractCreated').withArgs("claim", claimAddr);
        await expect(tx).to.emit(hubContract, 'ContractCreated').withArgs("process", claimAddr);

        //Expect Post Event
        // await expect(tx).to.emit(claimContract, 'Post').withArgs(this.adminAddr, posts[0].tokenId, posts[0].entRole, posts[0].postRole, posts[0].uri);
        await expect(tx).to.emit(claimContract, 'Post').withArgs(this.adminAddr, posts[0].tokenId, posts[0].entRole, posts[0].uri);
      });


      it("Should be Created & Closed (by Game)", async function () {
        //Soul Tokens
        soulTokens.authority = await soulContract.tokenByAddress(this.authorityAddr);
        const claim = {type:"CLAIM", name:"Test Claim #3"}
        let ruleRefArr = [
          {
            game: gameContract.address, 
            ruleId: 1,
          }
        ];
        let roleRefArr = [
          {
            role: "subject",
            tokenId: soulTokens.tester2,
          },
          {
            role: "witness",
            tokenId: soulTokens.tester3,
          },
        ];
        let posts: any = [
          // {
          //   tokenId: soulTokens.authority, 
          //   entRole: "authority",
          //   uri: test_uri,
          // }
        ];

        //Assign as a Member (Needs to be both a member and an authority)
        // await gameContract.connect(authority).join();
        await gameContract.connect(admin).roleAssign(this.authorityAddr, "member", 1);

        //Simulate - Get New Claim Address
        let claimAddr = await this.courtContract.connect(authority).callStatic.caseMakeClosed(claim.name, test_uri, ruleRefArr, roleRefArr, posts, test_uri2);
        //Create New Claim
        let tx = await this.courtContract.connect(authority).caseMakeClosed(claim.name, test_uri, ruleRefArr, roleRefArr, posts, test_uri2);
        //Expect Valid Address
        expect(claimAddr).to.be.properAddress;
        //Init Claim Contract
        let claimContract = await ethers.getContractFactory("ClaimUpgradable").then(res => res.attach(claimAddr));
        
        //Expect Claim Created Event
        // await expect(tx).to.emit(gameContract, 'ClaimCreated').withArgs(3, claimAddr);  //DEPRECATED
        // await expect(tx).to.emit(hubContract, 'ContractCreated').withArgs("claim", claimAddr);
        await expect(tx).to.emit(hubContract, 'ContractCreated').withArgs("process", claimAddr);

        //Expect Post Event
        // await expect(tx).to.emit(claimContract, 'Post').withArgs(this.authorityAddr, posts[0].tokenId, posts[0].entRole, posts[0].uri);

        //Expect State Change Events
        await expect(tx).to.emit(claimContract, "Stage").withArgs(1); //Open
        await expect(tx).to.emit(claimContract, "Stage").withArgs(2);  //Verdict
        await expect(tx).to.emit(claimContract, "Stage").withArgs(6);  //Closed
      });
      
      it("Should Update Claim Contract URI", async function () {
        //Before
        expect(await this.claimContract.contractURI()).to.equal(test_uri);
        //Change
        await this.claimContract.setContractURI(test_uri2);
        //After
        expect(await this.claimContract.contractURI()).to.equal(test_uri2);
      });

      it("Should Auto-Appoint creator as Admin", async function () {
        expect(
          await this.claimContract.roleHas(this.adminAddr, "admin")
        ).to.equal(true);
      });

      it("Tester expected to be in the subject role", async function () {
        expect(
          await this.claimContract.roleHas(this.tester2Addr, "subject")
        ).to.equal(true);
      });

      it("Users Can Apply to Join", async function () {
        //Apply to Join Game
        let tx = await this.claimContract.connect(tester).nominate(soulTokens.tester, test_uri);
        await tx.wait();
        //Expect Event
        await expect(tx).to.emit(this.claimContract, 'Nominate').withArgs(this.testerAddr, soulTokens.tester, test_uri);
      });

      it("Should Update", async function () {
        // let testClaimContract = await ethers.getContractFactory("ClaimUpgradable").then(res => res.deploy());
        let testClaimContract = await deployContract("ClaimUpgradable", []);
        await testClaimContract.deployed();
        //Update Claim Beacon (to the same implementation)
        hubContract.upgradeImplementation("claim", testClaimContract.address);
      });

      it("Should Add Rules", async function () {
        let ruleRef = {
          game: gameContract.address, 
          id: 2, 
          // affected: "investor",
        };
        // await this.claimContract.ruleRefAdd(ruleRef.game,  ruleRef.id, ruleRef.affected);
        await this.claimContract.connect(admin).ruleRefAdd(ruleRef.game,  ruleRef.id);
      });
      
      it("Should Write a Post", async function () {
        let post = {
          tokenId: soulTokens.tester2,
          entRole:"subject",
          uri:test_uri,
        };

        //Validate Permissions
        await expect(
          //Failed Post
          this.claimContract.connect(tester).post(post.entRole, post.tokenId, post.uri)
        ).to.be.revertedWith("POST:SOUL_NOT_YOURS");

        //Successful Post
        let tx = await this.claimContract.connect(tester2).post(post.entRole, post.tokenId, post.uri);
        // wait until the transaction is mined
        await tx.wait();
        //Expect Event
        await expect(tx).to.emit(this.claimContract, 'Post').withArgs(this.tester2Addr, post.tokenId, post.entRole, post.uri);
      });

      it("Should Update Token URI", async function () {
        //Protected
        await expect(
          this.claimContract.connect(tester3).setRoleURI("admin", test_uri)
        ).to.be.revertedWith("INVALID_PERMISSIONS");
        //Set Admin Token URI
        await this.claimContract.connect(admin).setRoleURI("admin", test_uri);
        //Validate
        expect(await this.claimContract.roleURI("admin")).to.equal(test_uri);
      });

      it("Should Assign Witness", async function () {
        //Assign Admin
        await this.claimContract.connect(admin).roleAssign(this.tester3Addr, "witness", 1);
        //Validate
        expect(await this.claimContract.roleHas(this.tester3Addr, "witness")).to.equal(true);
      });

      it("Game Authoritys Can Assign Themselves to Claim", async function () {
        //Assign as Game Authority
        gameContract.connect(admin).roleAssign(this.tester4Addr, "authority", 1);
        //Assign Claim Authority
        await this.claimContract.connect(tester4).roleAssign(this.tester4Addr, "authority", 1);
        //Validate
        expect(await this.claimContract.roleHas(this.tester4Addr, "authority")).to.equal(true);
      });

      it("User Can Open Claim", async function () {
        //Validate
        await expect(
          this.claimContract.connect(tester2).stageFile()
        ).to.be.revertedWith("ROLE:CREATOR_OR_ADMIN");
        //File Claim
        let tx = await this.claimContract.connect(admin).stageFile();
        //Expect State Event
        await expect(tx).to.emit(this.claimContract, "Stage").withArgs(1);
      });

      it("Should Validate Authority with parent game", async function () {
        //Validate
        await expect(
          this.claimContract.connect(admin).roleAssign(this.tester3Addr, "authority", 1)
        ).to.be.revertedWith("User Required to hold same role in the Game context");
      });

      it("Anyone Can Apply to Join", async function () {
        //Apply to Join Game
        let tx = await this.claimContract.connect(tester).nominate(soulTokens.tester, test_uri);
        await tx.wait();
        //Expect Event
        await expect(tx).to.emit(this.claimContract, 'Nominate').withArgs(this.testerAddr, soulTokens.tester, test_uri);
      });

      it("Should Accept a Authority From the parent game", async function () {
        //Check Before
        // expect(await gameContract.roleHas(this.testerAddr, "authority")).to.equal(true);
        //Assign Authority
        await this.claimContract.connect(admin).roleAssign(this.authorityAddr, "authority", 1);
        //Check After
        expect(await this.claimContract.roleHas(this.authorityAddr, "authority")).to.equal(true);
      });
      
      it("Should Wait for Verdict Stage", async function () {
        //File Claim
        let tx = await this.claimContract.connect(authority).stageWaitForDecision();
        //Expect State Event
        await expect(tx).to.emit(this.claimContract, "Stage").withArgs(2);
      });

      it("Should Wait for authority", async function () {
        let verdict = [{ ruleId:1, decision: true }];
        //File Claim -- Expect Failure
        await expect(
          this.claimContract.connect(tester2).stageDecision(verdict, test_uri)
        ).to.be.revertedWith("ROLE:AUTHORITY_ONLY");
      });

      it("Should Accept Verdict URI & Close Claim", async function () {
        let verdict = [{ruleId:1, decision:true}];
        //Submit Verdict & Close Claim
        let tx = await this.claimContract.connect(authority).stageDecision(verdict, test_uri);
        //Expect Verdict Event
        await expect(tx).to.emit(this.claimContract, "Verdict").withArgs(test_uri, this.authorityAddr);
        //Expect State Event
        await expect(tx).to.emit(this.claimContract, "Stage").withArgs(6);
      });

      // it("[TODO] Can Change Rating", async function () {

        //TODO: Tests for Collect Rating
        // let repCall = { tokenId:?, domain:?, rating:?};
        // let result = gameContract.getRepForDomain(soulContract.address,repCall. tokenId, repCall.domain, repCall.rating);

        // //Expect Event
        // await expect(tx).to.emit(soulContract, 'ReputationChange').withArgs(repCall.tokenId, repCall.domain, repCall.rating, repCall.amount);

        //Validate State
        // getRepForDomain(address contractAddr, uint256 tokenId, string domain, bool rating) public view override returns (uint256) {

        // let rep = await soulContract.getRepForDomain(repCall.tokenId, repCall.domain, repCall.rating);
        // expect(rep).to.equal(repCall.amount);

        // //Other Domain Rep - Should be 0
        // expect(await soulContract.getRepForDomain(repCall.tokenId, repCall.domain + 1, repCall.rating)).to.equal(0);

      // });

    }); //Court Game Flow

  }); // Game Flow

  /**
   * Safe ERC
   */
  describe("SafeERC721", function () {
    before(async function () {
      const nft = {
        name: 'SafeERC721',
        symbol: 'SAFENFT',
        uri: test_uri,
      };

      //Deploy SafeNFT
      const safeERCAddr = await hubContract.connect(admin).callStatic.makeERC721(nft.name, nft.symbol, nft.uri);
      let tx = await hubContract.connect(admin).makeERC721(nft.name, nft.symbol, nft.uri);
      //Expect Valid Address
      expect(safeERCAddr).to.be.properAddress;
      ++soulTokenId;

      //Attach Contract
      this.safeERC721 = await ethers.getContractFactory("SafeERC721").then(res => res.attach(safeERCAddr));
      //Verify Config
      expect(await this.safeERC721.name()).to.equal(nft.name);
      expect(await this.safeERC721.symbol()).to.equal(nft.symbol);

      //Event: Set Owner Tracker
      let eventData = {
        fromSBT: await soulContract.tokenByAddress(this.safeERC721.address),
        key: "owner",
        toSBT: await soulContract.tokenByAddress(this.adminAddr),
      };
      await expect(tx).to.emit(soulContract, "RelSet").withArgs(eventData.fromSBT, eventData.key, eventData.toSBT);
    });
    
    it("Should be owned by deployer", async function () {
      //Check Owner
      expect(await this.safeERC721.owner()).to.equal(this.adminAddr);
    });
    
    it("Should mint", async function () {
      let tx = await this.safeERC721.connect(admin).mint(this.testerAddr, test_uri+"xx1");
      tx.wait();
      //Check Owner
      expect(await this.safeERC721.ownerOf(1)).to.equal(this.testerAddr);
      //Check URI
      expect(await this.safeERC721.tokenURI(1)).to.equal(test_uri+"xx1");
    });

  });

  describe("SafeERC1155", function () {
    before(async function () {

      //Deploy SafeNFT
      const safeERCAddr = await hubContract.connect(admin).callStatic.makeERC1155(test_uri);
      let tx = await hubContract.connect(admin).makeERC1155(test_uri);

      //Expect Valid Address
      expect(safeERCAddr).to.be.properAddress;

      ++soulTokenId;
      //Attach Contract
      this.safeERC1155 = await ethers.getContractFactory("SafeERC1155").then(res => res.attach(safeERCAddr));

      //Events
      let eventData = {
        fromSBT: await soulContract.tokenByAddress(this.safeERC1155.address),
        key: "owner",
        toSBT: await soulContract.tokenByAddress(this.adminAddr),
      };
      await expect(tx).to.emit(soulContract, "RelSet")
        .withArgs(eventData.fromSBT, eventData.key, eventData.toSBT);
    });

    it("Should be owned by deployer", async function () {
      //Check Owner
      expect(await this.safeERC1155.owner()).to.equal(this.adminAddr);
    });
    
    it("Should mint", async function () {
      let tx = await this.safeERC1155.connect(admin).mint(this.testerAddr, 1, 1, test_uri+"xx2");
      tx.wait();
      //Check Owner
      expect(await this.safeERC1155.balanceOf(this.testerAddr, 1)).to.equal(1);
      //Check URI
      // expect(await this.safeERC1155.tokenURI(1)).to.equal(test_uri+"xx2");
    });

  });
  
});
