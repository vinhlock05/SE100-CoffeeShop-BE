import { prisma } from '~/config/database';

export interface CustomerReportResponse {
    displayType: 'report';
    totals: {
        totalCustomers: number;
        totalOrders: number;
        totalQuantity: number;
        totalRevenue: number;
    };
    customers: Array<{
        customerId: number;
        customerCode: string;
        customerName: string;
        phone: string;
        groupName: string;
        totalOrders: number;
        totalQuantity: number;
        totalRevenue: number;
    }>;
}

export interface CustomerChartResponse {
    displayType: 'chart';
    data: Array<{
        customerId: number;
        customerCode: string;
        customerName: string;
        revenue: number;
    }>;
}

export const getCustomerReport = async (
    startDate: Date,
    endDate: Date,
    customerGroupIds?: number[],
    search?: string
): Promise<CustomerReportResponse> => {
    // 1. Base filter for orders
    const whereClause: any = {
        completedAt: {
            gte: startDate,
            lte: endDate
        },
        paymentStatus: 'paid',
        status: {
            not: 'CANCELED' // Only completed/paid orders
        },
        customerId: {
            not: null // Exclude "retail" (null customer)
        }
    };

    if (customerGroupIds && customerGroupIds.length > 0) {
        whereClause.customer = {
            groupId: {
                in: customerGroupIds
            }
        };
    }

    if (search) {
        whereClause.customer = {
            ...whereClause.customer,
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } }
            ]
        };
    }

    const orders = await prisma.order.findMany({
        where: whereClause,
        select: {
            id: true,
            totalAmount: true,
            customerId: true,
            customer: {
                select: {
                    id: true,
                    code: true,
                    name: true,
                    phone: true,
                    group: {
                        select: {
                            name: true
                        }
                    }
                }
            },
            orderItems: {
                select: {
                    quantity: true
                }
            }
        }
    });

    // 3. Aggregate data per customer
    const customerMap = new Map<number, {
        customerId: number;
        customerCode: string;
        customerName: string;
        phone: string;
        groupName: string;
        totalOrders: number;
        totalQuantity: number;
        totalRevenue: number;
    }>();

    for (const order of orders) {
        if (!order.customerId || !order.customer) continue;

        const customerId = order.customerId;
        const current = customerMap.get(customerId) || {
            customerId,
            customerCode: order.customer.code,
            customerName: order.customer.name,
            phone: order.customer.phone || '-',
            groupName: order.customer.group?.name || 'Chưa phân nhóm',
            totalOrders: 0,
            totalQuantity: 0,
            totalRevenue: 0
        };

        current.totalOrders += 1;
        current.totalRevenue += Number(order.totalAmount); // Assuming net revenue

        // Calculate quantity for this order
        const orderQuantity = order.orderItems.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
        current.totalQuantity += orderQuantity;

        customerMap.set(customerId, current);
    }

    const customers = Array.from(customerMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue); // Default sort by revenue DESC

    // 4. Calculate totals
    const totalCustomers = customers.length;
    const totalOrders = customers.reduce((sum: number, item: { totalOrders: number }) => sum + item.totalOrders, 0);
    const totalQuantity = customers.reduce((sum: number, item: { totalQuantity: number }) => sum + item.totalQuantity, 0);
    const totalRevenueTotal = customers.reduce((sum: number, item: { totalRevenue: number }) => sum + item.totalRevenue, 0);

    return {
        displayType: 'report',
        totals: {
            totalCustomers,
            totalOrders,
            totalQuantity,
            totalRevenue: totalRevenueTotal
        },
        customers: customers
    };
};

export const getCustomerChart = async (
    startDate: Date,
    endDate: Date
): Promise<CustomerChartResponse> => {
    // Top 10 customers by revenue
    // Exclude retail customers (customerId: null)

    // We can use groupBy here for efficiency
    const grouped = await prisma.order.groupBy({
        by: ['customerId'],
        where: {
            completedAt: {
                gte: startDate,
                lte: endDate
            },
            paymentStatus: 'paid',
            status: {
                not: 'CANCELED'
            },
            customerId: {
                not: null
            }
        },
        _sum: {
            totalAmount: true
        },
        orderBy: {
            _sum: {
                totalAmount: 'desc'
            }
        },
        take: 10
    });

    // Fetch customer details for these IDs
    const customerIds = grouped.filter((g: any) => g.customerId !== null).map((g: any) => g.customerId as number);

    if (customerIds.length === 0) {
        return {
            displayType: 'chart',
            data: []
        };
    }

    const customers = await prisma.customer.findMany({
        where: {
            id: {
                in: customerIds
            }
        },
        select: {
            id: true,
            code: true,
            name: true
        }
    });

    const customerLookup = new Map(customers.map((c: any) => [c.id, c]));

    const data = grouped
        .filter((g: any) => g.customerId !== null)
        .map((g: any) => {
            const customerId = g.customerId as number;
            const customerInfo = customerLookup.get(customerId);
            return {
                customerId,
                customerCode: customerInfo?.code || 'UNK',
                customerName: customerInfo?.name || 'Unknown',
                revenue: g._sum.totalAmount || 0
            };
        });

    return {
        displayType: 'chart',
        data
    };
};
