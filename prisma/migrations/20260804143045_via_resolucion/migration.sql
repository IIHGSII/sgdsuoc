-- AlterTable
ALTER TABLE `expedientes` ADD COLUMN `via_resolucion_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `vias_resolucion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `tipo_salida_sugerido` ENUM('NOTA', 'PORTAL', 'OTRO') NULL,
    `destino_sugerido_id` INTEGER NULL,

    UNIQUE INDEX `vias_resolucion_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vias_resolucion` ADD CONSTRAINT `vias_resolucion_destino_sugerido_id_fkey` FOREIGN KEY (`destino_sugerido_id`) REFERENCES `destinos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expedientes` ADD CONSTRAINT `expedientes_via_resolucion_id_fkey` FOREIGN KEY (`via_resolucion_id`) REFERENCES `vias_resolucion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

