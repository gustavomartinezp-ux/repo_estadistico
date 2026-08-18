/**
 * Vercel Blob en producción (persistente, y necesario para subir archivos
 * grandes esquivando el límite de 4.5MB del body de las Serverless
 * Functions); disco local en desarrollo, sin necesitar credenciales de la
 * nube para levantar el proyecto.
 */
export const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
