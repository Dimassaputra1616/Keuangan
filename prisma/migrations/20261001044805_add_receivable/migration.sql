-- CreateTable
CREATE TABLE "Receivable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "lentAt" DATETIME NOT NULL,
    "dueAt" DATETIME,
    "notes" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "lentTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Receivable_lentTransactionId_fkey" FOREIGN KEY ("lentTransactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceivablePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receivableId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    "notes" TEXT,
    "transactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReceivablePayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReceivablePayment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Receivable_lentTransactionId_key" ON "Receivable"("lentTransactionId");

-- CreateIndex
CREATE INDEX "Receivable_isCancelled_idx" ON "Receivable"("isCancelled");

-- CreateIndex
CREATE INDEX "Receivable_dueAt_idx" ON "Receivable"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivablePayment_transactionId_key" ON "ReceivablePayment"("transactionId");

-- CreateIndex
CREATE INDEX "ReceivablePayment_receivableId_idx" ON "ReceivablePayment"("receivableId");

-- CreateIndex
CREATE INDEX "ReceivablePayment_receivedAt_idx" ON "ReceivablePayment"("receivedAt");
