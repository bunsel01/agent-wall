const { expect } = require("chai");
const { ethers } = require("hardhat");

// The registry address hardcoded in AgentWall.sol (BNB Chain mainnet).
const REGISTRY = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F";
const DAY = 86400;

async function latestTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}

/// Advance chain time to `secondsIntoDay` past the start of the UTC day that
/// is `daysAhead` days after the current block's day, then mine a block.
async function advanceToDay(daysAhead, secondsIntoDay = 3600) {
  const now = await latestTimestamp();
  const currentDay = Math.floor(now / DAY);
  const target = (currentDay + daysAhead) * DAY + secondsIntoDay;
  await ethers.provider.send("evm_increaseTime", [target - now]);
  await ethers.provider.send("evm_mine", []);
}

describe("AgentWall", function () {
  let wall, registry, owner, alice, bob, carol;

  beforeEach(async function () {
    [owner, alice, bob, carol] = await ethers.getSigners();

    // Deploy the mock registry, then copy its runtime code onto the real
    // registry address so AgentWall's hardcoded constant resolves to it.
    const Mock = await ethers.getContractFactory("MockAgentId");
    const mock = await Mock.deploy();
    await mock.waitForDeployment();
    const code = await ethers.provider.getCode(await mock.getAddress());
    await ethers.provider.send("hardhat_setCode", [REGISTRY, code]);
    registry = Mock.attach(REGISTRY);

    const Wall = await ethers.getContractFactory("AgentWall");
    wall = await Wall.deploy();
    await wall.waitForDeployment();
  });

  it("reports the hardcoded Agent ID registry", async function () {
    expect(await wall.agentIdRegistry()).to.equal(REGISTRY);
  });

  it("logs deployment gas (for DEPLOY-NOTES)", async function () {
    const receipt = await wall.deploymentTransaction().wait();
    console.log(`      AgentWall deployment gasUsed: ${receipt.gasUsed}`);
  });

  describe("gating", function () {
    it("rejects check-in from a non-holder", async function () {
      await expect(wall.connect(alice).checkIn("gm")).to.be.revertedWith(
        "AgentWall: Agent ID required"
      );
    });

    it("rejects setProfile from a non-holder", async function () {
      await expect(
        wall.connect(alice).setProfile("Alice", "https://x.com/alice")
      ).to.be.revertedWith("AgentWall: Agent ID required");
    });
  });

  describe("check-in", function () {
    beforeEach(async function () {
      await registry.mint(alice.address);
    });

    it("lets a holder check in and records everything", async function () {
      const now = await latestTimestamp();
      const day = Math.floor(now / DAY);

      await expect(wall.connect(alice).checkIn("first gm"))
        .to.emit(wall, "CheckedIn")
        .withArgs(alice.address, day, 1, "first gm");

      const info = await wall.userInfo(alice.address);
      expect(info.totalCheckIns_).to.equal(1);
      expect(info.streak).to.equal(1);
      expect(info.longestStreak).to.equal(1);
      expect(info.lastCheckInDay).to.equal(day);
      expect(info.hasCheckedInToday).to.equal(true);

      expect(await wall.checkInCount()).to.equal(1);
      const page = await wall.getCheckIns(0, 10);
      expect(page.length).to.equal(1);
      expect(page[0].user).to.equal(alice.address);
      expect(page[0].day).to.equal(day);
      expect(page[0].message).to.equal("first gm");
    });

    it("rejects a second check-in on the same UTC day", async function () {
      await wall.connect(alice).checkIn("one");
      await expect(wall.connect(alice).checkIn("two")).to.be.revertedWith(
        "AgentWall: already checked in today"
      );
    });

    it("rejects messages over 280 bytes", async function () {
      await expect(
        wall.connect(alice).checkIn("x".repeat(281))
      ).to.be.revertedWith("AgentWall: message too long");
      await wall.connect(alice).checkIn("x".repeat(280)); // exactly 280 is fine
    });

    it("increments the streak on consecutive days", async function () {
      await wall.connect(alice).checkIn("day 0");
      await advanceToDay(1);
      const day1 = Math.floor((await latestTimestamp()) / DAY);
      await expect(wall.connect(alice).checkIn("day 1"))
        .to.emit(wall, "CheckedIn")
        .withArgs(alice.address, day1, 2, "day 1");

      const info = await wall.userInfo(alice.address);
      expect(info.totalCheckIns_).to.equal(2);
      expect(info.streak).to.equal(2);
      expect(info.longestStreak).to.equal(2);
      expect(info.hasCheckedInToday).to.equal(true);
    });

    it("resets the streak after a gap day but keeps the longest streak", async function () {
      await wall.connect(alice).checkIn("day 0");
      await advanceToDay(1);
      await wall.connect(alice).checkIn("day 1"); // streak 2
      await advanceToDay(2); // skip a full day
      await wall.connect(alice).checkIn("day 3"); // streak resets to 1

      const info = await wall.userInfo(alice.address);
      expect(info.totalCheckIns_).to.equal(3);
      expect(info.streak).to.equal(1);
      expect(info.longestStreak).to.equal(2);
    });
  });

  describe("profiles", function () {
    beforeEach(async function () {
      await registry.mint(bob.address);
    });

    it("sets and updates a profile", async function () {
      await expect(wall.connect(bob).setProfile("Bob", "https://x.com/bob"))
        .to.emit(wall, "ProfileSet")
        .withArgs(bob.address, "Bob", "https://x.com/bob");

      let p = await wall.profileOf(bob.address);
      expect(p.name).to.equal("Bob");
      expect(p.url).to.equal("https://x.com/bob");

      await wall.connect(bob).setProfile("Bobby", "https://bob.example");
      p = await wall.profileOf(bob.address);
      expect(p.name).to.equal("Bobby");
      expect(p.url).to.equal("https://bob.example");
    });

    it("enforces name/url length limits", async function () {
      await expect(
        wall.connect(bob).setProfile("n".repeat(65), "https://x")
      ).to.be.revertedWith("AgentWall: name too long");
      await expect(
        wall.connect(bob).setProfile("ok", "u".repeat(129))
      ).to.be.revertedWith("AgentWall: url too long");
    });

    it("returns empty profile for an address that never set one", async function () {
      const p = await wall.profileOf(carol.address);
      expect(p.name).to.equal("");
      expect(p.url).to.equal("");
    });
  });

  describe("totals and pagination", function () {
    beforeEach(async function () {
      await registry.mint(alice.address);
      await registry.mint(bob.address);
    });

    it("counts unique users only on their first ever check-in", async function () {
      await wall.connect(alice).checkIn("a1");
      await wall.connect(bob).checkIn("b1");
      let t = await wall.totals();
      expect(t.totalUsers_).to.equal(2);
      expect(t.totalCheckIns_).to.equal(2);

      await advanceToDay(1);
      await wall.connect(alice).checkIn("a2"); // repeat user, next day
      t = await wall.totals();
      expect(t.totalUsers_).to.equal(2);
      expect(t.totalCheckIns_).to.equal(3);
    });

    it("paginates the wall and caps the page size at 50", async function () {
      // 3 check-ins across two users and two days.
      await wall.connect(alice).checkIn("a1");
      await wall.connect(bob).checkIn("b1");
      await advanceToDay(1);
      await wall.connect(alice).checkIn("a2");

      let page = await wall.getCheckIns(0, 2);
      expect(page.length).to.equal(2);
      expect(page[0].message).to.equal("a1");
      expect(page[1].message).to.equal("b1");

      page = await wall.getCheckIns(2, 2);
      expect(page.length).to.equal(1);
      expect(page[0].message).to.equal("a2");

      page = await wall.getCheckIns(3, 10); // offset past the end
      expect(page.length).to.equal(0);

      page = await wall.getCheckIns(0, 1000); // limit capped at 50, only 3 exist
      expect(page.length).to.equal(3);
    });
  });
});
