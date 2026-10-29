-- AlterTable
ALTER TABLE `expedientes` ADD COLUMN `seguimiento` ENUM('ABIERTO', 'CERRADO') NULL;

-- CreateTable
CREATE TABLE `novedades_seguimiento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `expediente_id` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `donde_esta` VARCHAR(191) NOT NULL,
    `detalle` TEXT NOT NULL,
    `cierre` BOOLEAN NOT NULL DEFAULT false,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `novedades_seguimiento_expediente_id_idx`(`expediente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `expedientes_seguimiento_idx` ON `expedientes`(`seguimiento`);

-- AddForeignKey
ALTER TABLE `novedades_seguimiento` ADD CONSTRAINT `novedades_seguimiento_expediente_id_fkey` FOREIGN KEY (`expediente_id`) REFERENCES `expedientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

