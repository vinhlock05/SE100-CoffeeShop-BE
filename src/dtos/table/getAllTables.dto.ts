
export interface GetAllTablesQuery {
    page?: number
    limit?: number
    q?: string
    areaId?: string | number
    isActive?: boolean
    sort?: Record<string, 'ASC' | 'DESC'>
}
