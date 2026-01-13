import { prisma } from "~/config";

export default async function seedShifts() {
    const data = [
            { id: 1, name: "Ca sáng", startTime: "08:00", endTime: "12:00", checkInTime: "08:00", checkOutTime: "12:00", isActive: true },
            { id: 2, name: "Ca chiều", startTime: "12:00", endTime: "16:00", checkInTime: "12:00", checkOutTime: "16:00", isActive: true },
            { id: 3, name: "Ca tối", startTime: "16:00", endTime: "20:00", checkInTime: "16:00", checkOutTime: "20:00", isActive: true },
        ]
    const result = []
    for (const item of data) {
        const shift = await prisma.shift.upsert({
            where: { id: item.id },
            update: {
                name: item.name,
                startTime: toDateTime(item.startTime),
                endTime: toDateTime(item.endTime),
                checkInTime: toDateTime(item.checkInTime),
                checkOutTime: toDateTime(item.checkOutTime),
                isActive: item.isActive,
            },
            create: {
                name: item.name,
                startTime: toDateTime(item.startTime),
                endTime: toDateTime(item.endTime),
                checkInTime: toDateTime(item.checkInTime),
                checkOutTime: toDateTime(item.checkOutTime),
                isActive: item.isActive,
            },
        })
        result.push(shift)
    }
    return result

    function toDateTime(time: string) {
        const [hours, minutes] = time.split(':').map(Number)
        return new Date(0, 0, 0, hours, minutes)
    }
}