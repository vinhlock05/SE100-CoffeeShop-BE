if (process.env.NODE_ENV === 'production') {
    require('module-alias/register')
}

import { prisma } from './config/database'
import app from './app'

const PORT = process.env.PORT || 4000

async function startServer() {
    // Test database connection
    try {
        await prisma.$connect()
        console.log('✅ Database connected successfully')
    } catch (error) {
        console.error('❌ Database connection failed:', error)
        process.exit(1)
    }

    // TODO: Add seed initial data here if needed
    // await seedInitialData()

    const server = app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`))

    // Graceful shutdown
    process.on('SIGINT', async () => {
        await prisma.$disconnect()
        server.close(() => {
            console.log('👋 Server closed gracefully')
            process.exit(0)
        })
    })
}

startServer()
