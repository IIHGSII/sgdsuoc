-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_usuario_key`(`usuario`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estados` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `es_final` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `estados_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tipos_documento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `tipos_documento_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `servicios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `servicios_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `destinos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `destinos_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `adjuntos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_archivo` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `tamanio_bytes` INTEGER NOT NULL,
    `contenido` LONGBLOB NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expedientes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nro_mesa_entrada` VARCHAR(191) NOT NULL,
    `nro_suoc` INTEGER NOT NULL,
    `anio_suoc` INTEGER NOT NULL,
    `nro_simese` VARCHAR(191) NULL,
    `fecha_ingreso_adm` DATETIME(3) NOT NULL,
    `fecha_ingreso_suoc` DATETIME(3) NOT NULL,
    `tipo_documento_id` INTEGER NOT NULL,
    `servicio_origen_id` INTEGER NOT NULL,
    `asunto` TEXT NOT NULL,
    `monto_estimado` DECIMAL(15, 2) NULL,
    `estado_actual_id` INTEGER NOT NULL,
    `fecha_ultima_actualizacion` DATETIME(3) NOT NULL,
    `adjunto_id` INTEGER NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `expedientes_adjunto_id_key`(`adjunto_id`),
    INDEX `expedientes_nro_mesa_entrada_idx`(`nro_mesa_entrada`),
    INDEX `expedientes_nro_simese_idx`(`nro_simese`),
    UNIQUE INDEX `expedientes_nro_suoc_anio_suoc_key`(`nro_suoc`, `anio_suoc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salidas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `expediente_id` INTEGER NOT NULL,
    `tipo` ENUM('NOTA', 'PORTAL', 'OTRO') NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `destino_id` INTEGER NULL,
    `nro_nota` VARCHAR(191) NULL,
    `firmada_por` VARCHAR(191) NULL,
    `referencia` VARCHAR(191) NULL,
    `descripcion` TEXT NOT NULL,
    `adjunto_id` INTEGER NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `salidas_adjunto_id_key`(`adjunto_id`),
    INDEX `salidas_expediente_id_idx`(`expediente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trazabilidad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `expediente_id` INTEGER NOT NULL,
    `estado_anterior_id` INTEGER NULL,
    `estado_nuevo_id` INTEGER NOT NULL,
    `fecha_cambio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `observaciones` TEXT NULL,

    INDEX `trazabilidad_expediente_id_idx`(`expediente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `expedientes` ADD CONSTRAINT `expedientes_tipo_documento_id_fkey` FOREIGN KEY (`tipo_documento_id`) REFERENCES `tipos_documento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expedientes` ADD CONSTRAINT `expedientes_servicio_origen_id_fkey` FOREIGN KEY (`servicio_origen_id`) REFERENCES `servicios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expedientes` ADD CONSTRAINT `expedientes_estado_actual_id_fkey` FOREIGN KEY (`estado_actual_id`) REFERENCES `estados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expedientes` ADD CONSTRAINT `expedientes_adjunto_id_fkey` FOREIGN KEY (`adjunto_id`) REFERENCES `adjuntos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salidas` ADD CONSTRAINT `salidas_expediente_id_fkey` FOREIGN KEY (`expediente_id`) REFERENCES `expedientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salidas` ADD CONSTRAINT `salidas_destino_id_fkey` FOREIGN KEY (`destino_id`) REFERENCES `destinos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salidas` ADD CONSTRAINT `salidas_adjunto_id_fkey` FOREIGN KEY (`adjunto_id`) REFERENCES `adjuntos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trazabilidad` ADD CONSTRAINT `trazabilidad_expediente_id_fkey` FOREIGN KEY (`expediente_id`) REFERENCES `expedientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trazabilidad` ADD CONSTRAINT `trazabilidad_estado_anterior_id_fkey` FOREIGN KEY (`estado_anterior_id`) REFERENCES `estados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trazabilidad` ADD CONSTRAINT `trazabilidad_estado_nuevo_id_fkey` FOREIGN KEY (`estado_nuevo_id`) REFERENCES `estados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

