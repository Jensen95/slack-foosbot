-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "initials" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "name" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Player_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "winnerId" TEXT NOT NULL,
    "looserId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_looserId_fkey" FOREIGN KEY ("looserId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TrueSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mu" DECIMAL NOT NULL,
    "sigma" DECIMAL NOT NULL,
    "pi" DECIMAL NOT NULL,
    "tau" DECIMAL NOT NULL,
    "playerId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrueSkill_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Glicko2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rating" DECIMAL NOT NULL,
    "rd" DECIMAL NOT NULL,
    "vol" DECIMAL NOT NULL,
    "playerId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Glicko2_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Elo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "elo" DECIMAL NOT NULL,
    "playerId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Elo_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_initials_channelId_key" ON "Player"("initials", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_teamId_key" ON "Channel"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_id_teamId_key" ON "Channel"("id", "teamId");

