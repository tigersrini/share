-- CreateTable
CREATE TABLE "SparePart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "make" TEXT,
    "category" TEXT,
    "costPrice" REAL NOT NULL DEFAULT 0,
    "sellingPrice" REAL NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockAt" INTEGER NOT NULL DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InventoryTxn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sparePartId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "jobCardId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryTxn_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryTxn_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "regNumber" TEXT NOT NULL,
    "vin" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "complaints" TEXT NOT NULL,
    "odometer" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "JobCard_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobCard_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobCardPart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobCardId" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceAtSale" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobCardPart_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobCardPart_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobCardLabor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobCardId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobCardLabor_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobCardId" TEXT NOT NULL,
    "partsTotal" REAL NOT NULL,
    "laborTotal" REAL NOT NULL,
    "taxPercent" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "grandTotal" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "whatsappSentAt" DATETIME,
    CONSTRAINT "Bill_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SparePart_barcode_key" ON "SparePart"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_customerId_regNumber_key" ON "Vehicle"("customerId", "regNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_jobCardId_key" ON "Bill"("jobCardId");
