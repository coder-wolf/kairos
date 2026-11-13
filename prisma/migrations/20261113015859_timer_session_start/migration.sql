/*
  Warnings:

  - Added the required column `sessionStartedAt` to the `TimerState` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TimerState" ADD COLUMN     "sessionStartedAt" TIMESTAMP(3) NOT NULL;
