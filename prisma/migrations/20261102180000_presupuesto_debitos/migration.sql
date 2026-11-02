-- AlterTable
ALTER TABLE `partidas_presupuesto`
    ADD COLUMN `plan_financiero` DECIMAL(15, 2) NULL,
    ADD COLUMN `fecha_informe` DATE NULL;

-- CreateTable
CREATE TABLE `debitos_presupuesto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `partida_id` INTEGER NOT NULL,
    `cdp` INTEGER NOT NULL,
    `codigo_contratacion` VARCHAR(191) NULL,
    `concepto` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `prevision` DECIMAL(15, 2) NOT NULL,
    `compromiso` DECIMAL(15, 2) NOT NULL,

    UNIQUE INDEX `debitos_presupuesto_partida_id_cdp_key`(`partida_id`, `cdp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `debitos_presupuesto` ADD CONSTRAINT `debitos_presupuesto_partida_id_fkey` FOREIGN KEY (`partida_id`) REFERENCES `partidas_presupuesto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Informe de Débitos de Sistework del 02/11/2026, rubro 245 (F.F. 10).
UPDATE `partidas_presupuesto`
SET `plan_financiero` = 884236454, `fecha_informe` = '2026-11-02'
WHERE `anio` = 2026 AND `objeto_gasto` = 245 AND `fuente` = 10;

INSERT INTO `debitos_presupuesto` (`partida_id`, `cdp`, `codigo_contratacion`, `concepto`, `tipo`, `prevision`, `compromiso`)
SELECT `id`, 90001, NULL, 'Reserva presupuestaria de compromiso 2026', 'Reservas', 114296454, 114296454
FROM `partidas_presupuesto` WHERE `anio` = 2026 AND `objeto_gasto` = 245 AND `fuente` = 10;

INSERT INTO `debitos_presupuesto` (`partida_id`, `cdp`, `codigo_contratacion`, `concepto`, `tipo`, `prevision`, `compromiso`)
SELECT `id`, 101338, 'LP-12008-25-258787', 'Certificación de saldo del código de contratación', 'Declaración jurada', 110000000, 110000000
FROM `partidas_presupuesto` WHERE `anio` = 2026 AND `objeto_gasto` = 245 AND `fuente` = 10;

INSERT INTO `debitos_presupuesto` (`partida_id`, `cdp`, `codigo_contratacion`, `concepto`, `tipo`, `prevision`, `compromiso`)
SELECT `id`, 2534, 'LP-12008-25-258787', 'Certificación de cumplimiento PAC N° 472.316: contratación del servicio de limpieza para el Hospital General de Luque', 'Cumplimiento', 165000000, 165000000
FROM `partidas_presupuesto` WHERE `anio` = 2026 AND `objeto_gasto` = 245 AND `fuente` = 10;

INSERT INTO `debitos_presupuesto` (`partida_id`, `cdp`, `codigo_contratacion`, `concepto`, `tipo`, `prevision`, `compromiso`)
SELECT `id`, 98881, NULL, 'Reserva de reprogramación', 'Reservas', 494940000, 494940000
FROM `partidas_presupuesto` WHERE `anio` = 2026 AND `objeto_gasto` = 245 AND `fuente` = 10;
