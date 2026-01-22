import { Router } from 'express'
import multer from 'multer'
import { exportImportController } from '~/controllers/importExport.controller'
import { accessTokenValidation } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'

const importExportRouter = Router()

// Multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
})

importExportRouter.use(accessTokenValidation)

// GET Template
importExportRouter.get('/:module/template', wrapRequestHandler(exportImportController.getTemplate))

// GET Export
importExportRouter.get('/:module/export', wrapRequestHandler(exportImportController.exportData))

// POST Import
importExportRouter.post('/:module/import', upload.single('file'), wrapRequestHandler(exportImportController.importData))

export default importExportRouter
