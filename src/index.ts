if (process.env.NODE_ENV === 'production') {
    require('module-alias/register')
}


import 'reflect-metadata'
import { prisma } from './config/database'
import { seedInitialData } from './seeds/seed'
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

    // Sync database schema (in development mode)
    if (process.env.NODE_ENV !== 'production') {
        try {
            const { execSync } = require('child_process')
            console.log('🔄 Syncing database schema...')
            execSync('npx prisma db push', { 
                stdio: 'inherit',
                cwd: process.cwd()
            })
            console.log('✅ Database schema synchronized')
        } catch (error) {
            console.error('⚠️ Database sync failed (may already be in sync):', error)
            // Don't exit - allow server to continue
        }
    }

    // Seed initial data (uses upsert - safe to run every startup)
    try {
        await seedInitialData()
    } catch (error) {
        console.error('❌ Seed failed:', error)
        // Don't exit - allow server to continue even if seed fails
    }

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
