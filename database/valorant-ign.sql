-- Run this once in the MySQL schema used by the dashboard API.
-- Valorant's existing table has a tier column for rank; this adds the missing IGN field.
ALTER TABLE `Valorant`
  ADD COLUMN `ign` VARCHAR(100) NOT NULL DEFAULT '';
