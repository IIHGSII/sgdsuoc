-- AlterTable
ALTER TABLE `expedientes` ADD COLUMN `por_procesar` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `nro_mesa_entrada` VARCHAR(191) NULL,
    MODIFY `fecha_ingreso_adm` DATETIME(3) NULL,
    MODIFY `tipo_documento_id` INTEGER NULL,
    MODIFY `servicio_origen_id` INTEGER NULL,
    MODIFY `asunto` TEXT NULL;

-- CreateTable
CREATE TABLE `fotos_expediente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `expediente_id` INTEGER NOT NULL,
    `orden` INTEGER NOT NULL,
    `adjunto_id` INTEGER NOT NULL,

    UNIQUE INDEX `fotos_expediente_adjunto_id_key`(`adjunto_id`),
    UNIQUE INDEX `fotos_expediente_expediente_id_orden_key`(`expediente_id`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `expedientes_por_procesar_idx` ON `expedientes`(`por_procesar`);

-- AddForeignKey
ALTER TABLE `fotos_expediente` ADD CONSTRAINT `fotos_expediente_expediente_id_fkey` FOREIGN KEY (`expediente_id`) REFERENCES `expedientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fotos_expediente` ADD CONSTRAINT `fotos_expediente_adjunto_id_fkey` FOREIGN KEY (`adjunto_id`) REFERENCES `adjuntos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

