-- CreateTable
CREATE TABLE `EventSeries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `scenarioId` INTEGER NOT NULL,
    `startYearType` ENUM('fixed', 'random_uniform', 'random_normal', 'same_as', 'after') NOT NULL,
    `startYear` INTEGER NULL,
    `startMin` INTEGER NULL,
    `startMax` INTEGER NULL,
    `startMean` DOUBLE NULL,
    `startStd` DOUBLE NULL,
    `startOnOtherSeriesId` INTEGER NULL,
    `durationType` ENUM('fixed', 'random_uniform', 'random_normal') NOT NULL,
    `duration` INTEGER NULL,
    `durationMin` INTEGER NULL,
    `durationMax` INTEGER NULL,
    `durationMean` DOUBLE NULL,
    `durationStd` DOUBLE NULL,
    `type` ENUM('income', 'expense', 'invest', 'rebalance') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IncomeEventDetails` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `initialAmount` DOUBLE NOT NULL,
    `annualChangeType` ENUM('fixed', 'random_uniform', 'random_normal') NOT NULL,
    `annualChangeAmount` DOUBLE NULL,
    `annualChangePercentage` DOUBLE NULL,
    `annualChangeMin` DOUBLE NULL,
    `annualChangeMax` DOUBLE NULL,
    `annualChangeMean` DOUBLE NULL,
    `annualChangeStd` DOUBLE NULL,
    `inflationAdjustment` BOOLEAN NOT NULL,
    `userPercentage` DOUBLE NULL,
    `spousePercentage` DOUBLE NULL,
    `isSocialSecurity` BOOLEAN NOT NULL,
    `eventSeriesId` INTEGER NOT NULL,

    UNIQUE INDEX `IncomeEventDetails_eventSeriesId_key`(`eventSeriesId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpenseEventDetails` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `initialAmount` DOUBLE NOT NULL,
    `annualChangeType` ENUM('fixed', 'random_uniform', 'random_normal') NOT NULL,
    `annualChangeAmount` DOUBLE NULL,
    `annualChangePercentage` DOUBLE NULL,
    `annualChangeMin` DOUBLE NULL,
    `annualChangeMax` DOUBLE NULL,
    `annualChangeMean` DOUBLE NULL,
    `annualChangeStd` DOUBLE NULL,
    `inflationAdjustment` BOOLEAN NOT NULL,
    `userPercentage` DOUBLE NULL,
    `spousePercentage` DOUBLE NULL,
    `isDiscretionary` BOOLEAN NOT NULL,
    `order` INTEGER NULL,
    `eventSeriesId` INTEGER NOT NULL,

    UNIQUE INDEX `ExpenseEventDetails_eventSeriesId_key`(`eventSeriesId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvestEventDetails` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maxCash` DOUBLE NOT NULL,
    `order` INTEGER NULL,
    `initialAllocation` DOUBLE NOT NULL,
    `finalAllocation` DOUBLE NULL,
    `eventSeriesId` INTEGER NOT NULL,

    UNIQUE INDEX `InvestEventDetails_eventSeriesId_key`(`eventSeriesId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RebalanceEventDetails` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventSeriesId` INTEGER NOT NULL,

    UNIQUE INDEX `RebalanceEventDetails_eventSeriesId_key`(`eventSeriesId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetAllocation` (
    `aId` INTEGER NOT NULL AUTO_INCREMENT,
    `investmentId` INTEGER NOT NULL,
    `investEventDetailsId` INTEGER NULL,
    `rebalanceEventDetailsId` INTEGER NULL,
    `initialAllocation` DOUBLE NOT NULL,
    `finalAllocation` DOUBLE NULL,

    PRIMARY KEY (`aId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `returnType` ENUM('FIXED', 'NORMAL') NOT NULL,
    `fixedReturn` DOUBLE NULL,
    `normalReturnMean` DOUBLE NULL,
    `normalReturnStd` DOUBLE NULL,
    `expectedAnnualIncomeType` ENUM('FIXED', 'NORMAL') NOT NULL,
    `fixedIncome` DOUBLE NULL,
    `normalIncomeMean` DOUBLE NULL,
    `normalIncomeStd` DOUBLE NULL,
    `gbmIncomeDrift` DOUBLE NULL,
    `gbmIncomeVolatility` DOUBLE NULL,
    `expenseRatio` DOUBLE NOT NULL,
    `taxability` ENUM('TAXABLE', 'TAX_EXEMPT') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Investment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assetTypeId` INTEGER NOT NULL,
    `value` DOUBLE NOT NULL,
    `taxStatus` ENUM('NON_RETIREMENT', 'PRE_TAX_RETIREMENT', 'AFTER_TAX_RETIREMENT') NOT NULL,
    `rothConversionStrategy` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RMD` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `age` INTEGER NOT NULL,
    `distributionPeriod` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Scenario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `financialGoal` INTEGER NOT NULL,
    `forIndividual` BOOLEAN NOT NULL,
    `userBirthYear` INTEGER NOT NULL,
    `userLifeExpectancyMean` DOUBLE NOT NULL,
    `userLifeExpectancyStd` DOUBLE NOT NULL DEFAULT 0,
    `spouseBirthYear` INTEGER NULL,
    `spouseLifeExpectancyMean` INTEGER NULL,
    `spouseLifeExpectancyStd` DOUBLE NULL,
    `inflationAssumption` ENUM('fixed', 'random_uniform', 'random_normal') NOT NULL,
    `inflation` INTEGER NULL,
    `inflationMin` INTEGER NULL,
    `inflationMax` INTEGER NULL,
    `inflationMean` DOUBLE NULL,
    `inflationStd` DOUBLE NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `initialAfterTaxRetirementContributionLimit` INTEGER NOT NULL,
    `rothOptimizationStartYear` INTEGER NULL,
    `rothOptimizationEndYear` INTEGER NULL,
    `residenceState` ENUM('AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvestmentScenario` (
    `investmentId` INTEGER NOT NULL,
    `scenarioId` INTEGER NOT NULL,

    PRIMARY KEY (`investmentId`, `scenarioId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `googleId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StateBracket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` ENUM('AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY') NOT NULL,
    `bracket` INTEGER NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `rate` DOUBLE NOT NULL,

    UNIQUE INDEX `StateBracket_state_bracket_userId_key`(`state`, `bracket`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_readonly` (
    `A` INTEGER NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_readonly_AB_unique`(`A`, `B`),
    INDEX `_readonly_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_readwrite` (
    `A` INTEGER NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_readwrite_AB_unique`(`A`, `B`),
    INDEX `_readwrite_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EventSeries` ADD CONSTRAINT `EventSeries_scenarioId_fkey` FOREIGN KEY (`scenarioId`) REFERENCES `Scenario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventSeries` ADD CONSTRAINT `EventSeries_startOnOtherSeriesId_fkey` FOREIGN KEY (`startOnOtherSeriesId`) REFERENCES `EventSeries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncomeEventDetails` ADD CONSTRAINT `IncomeEventDetails_eventSeriesId_fkey` FOREIGN KEY (`eventSeriesId`) REFERENCES `EventSeries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseEventDetails` ADD CONSTRAINT `ExpenseEventDetails_eventSeriesId_fkey` FOREIGN KEY (`eventSeriesId`) REFERENCES `EventSeries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestEventDetails` ADD CONSTRAINT `InvestEventDetails_eventSeriesId_fkey` FOREIGN KEY (`eventSeriesId`) REFERENCES `EventSeries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RebalanceEventDetails` ADD CONSTRAINT `RebalanceEventDetails_eventSeriesId_fkey` FOREIGN KEY (`eventSeriesId`) REFERENCES `EventSeries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetAllocation` ADD CONSTRAINT `AssetAllocation_investmentId_fkey` FOREIGN KEY (`investmentId`) REFERENCES `Investment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetAllocation` ADD CONSTRAINT `AssetAllocation_investEventDetailsId_fkey` FOREIGN KEY (`investEventDetailsId`) REFERENCES `InvestEventDetails`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetAllocation` ADD CONSTRAINT `AssetAllocation_rebalanceEventDetailsId_fkey` FOREIGN KEY (`rebalanceEventDetailsId`) REFERENCES `RebalanceEventDetails`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Investment` ADD CONSTRAINT `Investment_assetTypeId_fkey` FOREIGN KEY (`assetTypeId`) REFERENCES `AssetType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Scenario` ADD CONSTRAINT `Scenario_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestmentScenario` ADD CONSTRAINT `InvestmentScenario_investmentId_fkey` FOREIGN KEY (`investmentId`) REFERENCES `Investment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestmentScenario` ADD CONSTRAINT `InvestmentScenario_scenarioId_fkey` FOREIGN KEY (`scenarioId`) REFERENCES `Scenario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StateBracket` ADD CONSTRAINT `StateBracket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_readonly` ADD CONSTRAINT `_readonly_A_fkey` FOREIGN KEY (`A`) REFERENCES `Scenario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_readonly` ADD CONSTRAINT `_readonly_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_readwrite` ADD CONSTRAINT `_readwrite_A_fkey` FOREIGN KEY (`A`) REFERENCES `Scenario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_readwrite` ADD CONSTRAINT `_readwrite_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
