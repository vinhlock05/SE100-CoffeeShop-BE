import { Request, Response } from 'express'
import { ExportImportService } from '~/services/excel.service'
import { SuccessResponse } from '~/core/success.response'
// Import other services as needed, e.g. inventoryService
import { inventoryItemService } from '~/services/inventoryItem.service'
import { customerService } from '~/services/customer.service'
import { supplierService } from '~/services/supplier.service'
import { staffService } from '~/services/staff.service'
import { BadRequestError } from '~/core/error.response'

// Map module name to service handler or logic
type ModuleType = 'inventory' | 'customer' | 'staff' | 'supplier' | 'customer-group'

export class ExportImportController {
  private excelService = new ExportImportService()

  /**
   * GET /api/export/:module/template
   */
  getTemplate = async (req: Request, res: Response) => {
    const { module } = req.params as { module: ModuleType }
    
    switch (module) {
        case 'inventory':
            // Fetch reference data logic
            const refData = await inventoryItemService.getReferenceData();
            const { categories, units, ingredients } = refData; // itemTypes not strictly needed for columns, but good for ref.

            const type = req.query.type as string; // 'inventory_ready' | 'inventory_composite' | 'inventory_ingredient'
            
            let invColumns: any[] = [];
            let invNote = '';

            if (type === 'inventory_composite') {
                invColumns = [
                    { header: 'Tên hàng hóa *', key: 'name', width: 30, note: 'Bắt buộc' },
                    { header: 'Mã hàng', key: 'code', width: 20, note: 'Để trống = tự tạo' },
                    { header: 'Loại hàng *', key: 'type', width: 20, note: 'Hàng cấu thành (Composite)' },
                    { header: 'Danh mục', key: 'category', width: 20 },
                    { header: 'Đơn vị *', key: 'unit', width: 15 },
                    { header: 'Giá bán', key: 'sellingPrice', width: 15 },
                    { header: 'Thành phần (Mã:SL...)', key: 'ingredients', width: 40, note: 'VD: NL001:2;NL002:0.5' },
                    { header: 'Trạng thái', key: 'productStatus', width: 15, note: 'selling | paused' },
                    { header: 'Mô tả/Ghi chú', key: 'notes', width: 30 }
                ];
                invNote = 'Nhập thành phần với định dạng: Mã_NL:Số_lượng (phân cách bằng dấu chấm phẩy ;). VD: CF01:20;SUG01:10';
            } else if (type === 'inventory_ingredient') {
                invColumns = [
                    { header: 'Tên nguyên liệu *', key: 'name', width: 30, note: 'Bắt buộc' },
                    { header: 'Mã nguyên liệu', key: 'code', width: 20, note: 'Để trống = tự tạo' },
                    { header: 'Loại hàng *', key: 'type', width: 20, note: 'Nguyên liệu (Ingredient)' },
                    { header: 'Danh mục', key: 'category', width: 20 },
                    { header: 'Đơn vị *', key: 'unit', width: 15 },
                    { header: 'Tồn min', key: 'minStock', width: 15 },
                    { header: 'Tồn max', key: 'maxStock', width: 15 },
                    { header: 'Giá vốn trung bình', key: 'avgUnitCost', width: 15 },
                    { header: 'Mô tả/Ghi chú', key: 'notes', width: 30 }
                ];
            } else {
                // Default or Ready-made
                invColumns = [
                    { header: 'Tên hàng hóa *', key: 'name', width: 30, note: 'Bắt buộc' },
                    { header: 'Mã hàng', key: 'code', width: 20, note: 'Để trống = tự tạo' },
                    { header: 'Loại hàng *', key: 'type', width: 20, note: 'Hàng bán sẵn (Ready-made)' },
                    { header: 'Danh mục', key: 'category', width: 20 },
                    { header: 'Đơn vị *', key: 'unit', width: 15 },
                    { header: 'Giá bán', key: 'sellingPrice', width: 15 },
                    { header: 'Tồn min', key: 'minStock', width: 15 },
                    { header: 'Tồn max', key: 'maxStock', width: 15 },
                    { header: 'Trạng thái', key: 'productStatus', width: 15 },
                    { header: 'Mô tả/Ghi chú', key: 'notes', width: 30 }
                ];
            }

            // Prepare extra sheets
            const extraSheets = [
                {
                    name: 'Danh Mục (Categories)',
                    columns: [{ header: 'ID', key: 'id' }, { header: 'Tên danh mục', key: 'name' }],
                    data: categories
                },
                {
                    name: 'Đơn Vị (Units)',
                    columns: [{ header: 'ID', key: 'id' }, { header: 'Tên đơn vị', key: 'name' }],
                    data: units
                }
            ];

            if (type === 'inventory_composite') {
                extraSheets.push({
                    name: 'Nguyên Liệu (Ingredients)',
                    columns: [{ header: 'Mã NL', key: 'code' }, { header: 'Tên nguyên liệu', key: 'name' }],
                    data: ingredients
                });
            }

            // Add note to columns if specific note exists
            if (invNote) {
               // Append to first column note or handle in generic? 
               // The generic handler uses column note.
            }

            // Sample Data
            let sampleRows: any[] = [];
            if (type === 'inventory_composite') {
                sampleRows = [{
                    name: 'Cà phê sữa đá', code: 'CFSD', type: 'Hàng cấu thành', category: 'Cà phê', unit: 'Ly',
                    sellingPrice: 25000, ingredients: 'CF01:20;SUG01:10', productStatus: 'selling', notes: 'Món bán chạy'
                }];
            } else if (type === 'inventory_ingredient') {
                sampleRows = [{
                    name: 'Hạt Cà Phê Robusta', code: 'CF01', type: 'Nguyên liệu', category: 'Nguyên liệu cà phê', unit: 'Gram',
                    minStock: 1000, maxStock: 5000, avgUnitCost: 200, notes: 'Nhập khẩu Dak Lak'
                }];
            } else {
                sampleRows = [{
                    name: 'Bánh Mì Que', code: 'BMQ', type: 'Hàng bán sẵn', category: 'Đồ ăn', unit: 'Cái',
                    sellingPrice: 15000, minStock: 10, maxStock: 50, productStatus: 'selling', notes: 'Bánh mì cay'
                }];
            }

            await this.excelService.generateTemplate(invColumns, 'Inventory', res, type || 'inventory', extraSheets, sampleRows);
            break;
        
        case 'customer':
            const customerCols = [
                { header: 'Tên khách hàng *', key: 'name', width: 25 },
                { header: 'Số điện thoại *', key: 'phone', width: 20 },
                { header: 'Giới tính (Nam/Nữ)', key: 'gender', width: 15 },
                { header: 'Ngày sinh (YYYY-MM-DD)', key: 'birthday', width: 20 },
                { header: 'Địa chỉ', key: 'address', width: 30 },
                { header: 'Thành phố', key: 'city', width: 20 },
            ];
            const customerSample = [{
                name: 'Nguyễn Văn A', phone: '0909123456', gender: 'Nam', birthday: '1990-01-01',
                address: '123 Nguyễn Huệ', city: 'TP.HCM'
            }];
            await this.excelService.generateTemplate(customerCols, 'Customers', res, 'customer', undefined, customerSample);
            break;

        case 'supplier':
            const supplierCols = [
                { header: 'Tên nhà cung cấp *', key: 'name', width: 30 },
                { header: 'Người liên hệ', key: 'contactPerson', width: 25 },
                { header: 'Số điện thoại', key: 'phone', width: 20 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'Địa chỉ', key: 'address', width: 30 },
                { header: 'Thành phố', key: 'city', width: 20 },
                { header: 'Danh mục', key: 'category', width: 20 },
            ];
            const supplierSample = [{
                name: 'Công ty Vinamilk', contactPerson: 'Chị Lan', phone: '0281234567', email: 'contact@vinamilk.com',
                address: '10 Tân Trào', city: 'TP.HCM', category: 'Sữa'
            }];
            await this.excelService.generateTemplate(supplierCols, 'Suppliers', res, 'supplier', undefined, supplierSample);
            break;

        case 'staff':
            const staffCols = [
                { header: 'Họ và tên *', key: 'fullName', width: 25 },
                { header: 'Số điện thoại *', key: 'phone', width: 20 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'CMND/CCCD', key: 'idCard', width: 20 },
                { header: 'Vị trí', key: 'position', width: 20 },
                { header: 'Phòng ban', key: 'department', width: 20 },
                { header: 'Giới tính', key: 'gender', width: 10 },
                { header: 'Ngày sinh (YYYY-MM-DD)', key: 'birthday', width: 15 },
                { header: 'Ngày vào làm (YYYY-MM-DD)', key: 'hireDate', width: 15 },
                { header: 'Mức lương cơ bản', key: 'baseRate', width: 15 },
                { header: 'Loại lương (shift/fixed)', key: 'salaryType', width: 20 },
                { header: 'Địa chỉ', key: 'address', width: 30 },
                { header: 'Thành phố', key: 'city', width: 20 },
                { header: 'Tên đăng nhập', key: 'username', width: 20 },
                { header: 'Mật khẩu', key: 'password', width: 20 },
                { header: 'Mã quyền (Role ID)', key: 'roleId', width: 15, note: 'Nhập ID quyền (Xem sheet Roles)' },
            ];

            // Reference Data
            const staffRef = await staffService.getReferenceData();
            const staffExtraSheets = [
                {
                    name: 'Roles',
                    columns: [{ header: 'ID', key: 'id' }, { header: 'Quyền', key: 'name' }, { header: 'Mô tả', key: 'description' }],
                    data: staffRef.roles
                }
            ];

            const staffSample = [{
                fullName: 'Lê Thị B', phone: '0912345678', email: 'lethib@email.com', idCard: '079123456789',
                position: 'Nhân viên', department: 'Pha chế', gender: 'Nữ', birthday: '2000-05-05',
                hireDate: '2023-01-01', baseRate: 25000, salaryType: 'hourly', address: '456 Lê Lợi', city: 'TP.HCM',
                username: 'staff_b', password: '123', roleId: 1
            }];
            await this.excelService.generateTemplate(staffCols, 'Staff', res, 'staff', staffExtraSheets, staffSample);
            break;
        
        // Case for other modules...
        default:
            throw new BadRequestError({ message: 'Module not found or not supported for template' })
    }
  }

  /**
   * GET /api/export/:module
   */
  exportData = async (req: Request, res: Response) => {
    const { module } = req.params as { module: ModuleType }
    const filters = req.query

    switch (module) {
        case 'inventory':
            // Fetch data from inventoryService
            const data = await inventoryItemService.getAllItems({ limit: 10000 });
            const items = data.items || [];
            
            // Map to flat structure
            const exportRows = items.map((item: any) => ({
                name: item.name,
                code: item.code || item.id, // Assuming ID is used as code if code property missing
                type: item.itemType?.name || item.type,
                category: item.category?.name || item.category,
                unit: item.unit?.name || item.unit,
                avgUnitCost: item.avgUnitCost,
                sellingPrice: item.sellingPrice,
                currentStock: item.currentStock,
                minStock: item.minStock,
                maxStock: item.maxStock,
                status: item.productStatus
            }));

            const columns = [
                { header: 'Tên hàng hóa', key: 'name', width: 30 },
                { header: 'Mã hàng', key: 'code', width: 20 },
                { header: 'Loại hàng', key: 'type', width: 15 },
                { header: 'Danh mục', key: 'category', width: 20 },
                { header: 'Đơn vị', key: 'unit', width: 15 },
                { header: 'Giá vốn', key: 'avgUnitCost', width: 15 },
                { header: 'Giá bán', key: 'sellingPrice', width: 15 },
                { header: 'Tồn kho', key: 'currentStock', width: 15 },
                { header: 'Tồn min', key: 'minStock', width: 10 },
                { header: 'Tồn max', key: 'maxStock', width: 10 },
                { header: 'Trạng thái', key: 'status', width: 15 },
            ];

            await this.excelService.exportToExcel(exportRows, columns as any, 'Inventory', res, 'inventory_export');
            break;

        case 'customer':
            const customersData = await customerService.getAll({ limit: 10000 });
            const customers = customersData.customers || [];
            
            const custRows = customers.map((c: any) => ({
                code: c.code,
                name: c.name,
                phone: c.phone,
                group: c.groupName,
                gender: c.gender === 'MALE' ? 'Nam' : 'Nữ',
                totalSpent: c.totalSpent,
                status: c.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động',
                address: c.address
            }));

            const custCols = [
                { header: 'Mã KH', key: 'code', width: 15 },
                { header: 'Tên khách hàng', key: 'name', width: 30 },
                { header: 'Số điện thoại', key: 'phone', width: 20 },
                { header: 'Nhóm', key: 'group', width: 20 },
                { header: 'Giới tính', key: 'gender', width: 10 },
                { header: 'Tổng chi tiêu', key: 'totalSpent', width: 15 },
                { header: 'Trạng thái', key: 'status', width: 15 },
                { header: 'Địa chỉ', key: 'address', width: 30 },
            ];
            
            await this.excelService.exportToExcel(custRows, custCols as any, 'Customers', res, 'customer_export');
            break;

        case 'supplier':
            const suppliersData = await supplierService.getAll({ limit: "10000" });
            const suppliers = suppliersData.suppliers || [];
            
            const supplierRows = suppliers.map((s: any) => ({
                code: s.code,
                name: s.name,
                contactPerson: s.contactPerson,
                phone: s.phone,
                email: s.email,
                address: s.address,
                city: s.city,
                category: s.category,
                totalDebt: s.totalDebt,
                status: s.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'
            }));

            const supplierColsExport = [
                { header: 'Mã NCC', key: 'code', width: 15 },
                { header: 'Tên nhà cung cấp', key: 'name', width: 30 },
                { header: 'Người liên hệ', key: 'contactPerson', width: 20 },
                { header: 'Số điện thoại', key: 'phone', width: 20 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'Địa chỉ', key: 'address', width: 30 },
                { header: 'Thành phố', key: 'city', width: 20 },
                { header: 'Danh mục', key: 'category', width: 20 },
                { header: 'Công nợ', key: 'totalDebt', width: 15 },
                { header: 'Trạng thái', key: 'status', width: 15 },
            ];
            
            await this.excelService.exportToExcel(supplierRows, supplierColsExport as any, 'Suppliers', res, 'supplier_export');
            break;

        case 'staff':
            const staffData = await staffService.getAllStaff({ limit: "10000" });
            const staffs = staffData.staffs || [];

            const staffRows = staffs.map((s: any) => ({
                code: s.code,
                fullName: s.fullName,
                phone: s.phone,
                email: s.email,
                position: s.position,
                department: s.department,
                joinDate: s.hireDate ? new Date(s.hireDate).toLocaleDateString('vi-VN') : '',
                salaryType: s.salarySetting?.salaryType,
                baseRate: s.salarySetting?.baseRate,
                status: s.status === 'active' ? 'Hoạt động' : 'Đã nghỉ'
            }));

            const staffColsExport = [
                { header: 'Mã NV', key: 'code', width: 10 },
                { header: 'Họ tên', key: 'fullName', width: 25 },
                { header: 'SĐT', key: 'phone', width: 15 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'Vị trí', key: 'position', width: 15 },
                { header: 'Phòng ban', key: 'department', width: 15 },
                { header: 'Ngày vào làm', key: 'joinDate', width: 15 },
                { header: 'Loại lương', key: 'salaryType', width: 15 },
                { header: 'Lương cơ bản', key: 'baseRate', width: 15 },
                { header: 'Trạng thái', key: 'status', width: 15 },
            ];

            await this.excelService.exportToExcel(staffRows, staffColsExport as any, 'Staff', res, 'staff_export');
            break;

        default:
            throw new BadRequestError({ message: 'Module not found or not supported for export' })
    }
  }

  /**
   * POST /api/import/:module
   */
  importData = async (req: Request, res: Response) => {
    const { module } = req.params as { module: ModuleType }
    const file = req.file

    if (!file) throw new BadRequestError({ message: 'File is required' })

    switch (module) {
        case 'inventory':
            // Parse file
            const rows = await this.excelService.parseExcel(file.buffer, (row) => {
                const type = row.getCell(3).text?.trim().toLowerCase();
                
                // Base fields common to all
                const base = {
                    name: row.getCell(1).text,
                    code: row.getCell(2).text,
                    type: row.getCell(3).text,
                    category: row.getCell(4).text,
                    unit: row.getCell(5).text,
                };

                if (type === 'hàng cấu thành' || type === 'composite') {
                    return {
                        ...base,
                        sellingPrice: Number(row.getCell(6).value) || 0,
                        ingredients: row.getCell(7).text, // Ingredients column
                        productStatus: row.getCell(8).text,
                        notes: row.getCell(9).text
                    };
                } else if (type === 'nguyên liệu' || type === 'ingredient') {
                    return {
                        ...base,
                        minStock: Number(row.getCell(6).value) || 0,
                        maxStock: Number(row.getCell(7).value) || 0,
                        avgUnitCost: Number(row.getCell(8).value) || 0,
                        notes: row.getCell(9).text
                    };
                } else {
                    // Ready-made / Default
                    return {
                        ...base,
                        sellingPrice: Number(row.getCell(6).value) || 0,
                        minStock: Number(row.getCell(7).value) || 0,
                        maxStock: Number(row.getCell(8).value) || 0,
                        productStatus: row.getCell(9).text,
                        notes: row.getCell(10).text
                    };
                }
            });

            // Process Import in Service
            const result = await inventoryItemService.importItems(rows);

            new SuccessResponse({
                message: 'Import processed',
                metaData: result
            }).send(res);
            break;

        case 'customer':
             const custRowsParsed = await this.excelService.parseExcel(file.buffer, (row) => {
                return {
                    name: row.getCell(1).text,
                    phone: row.getCell(2).text,
                    code: row.getCell(3).text,
                    group: row.getCell(4).text,
                    gender: row.getCell(5).text,
                    birthday: row.getCell(6).value,
                    address: row.getCell(7).text,
                    city: row.getCell(8).text,
                };
            });

            const resultCust = await customerService.importCustomers(custRowsParsed);

            new SuccessResponse({
                message: 'Import processed',
                metaData: resultCust
            }).send(res);
            new SuccessResponse({
                message: 'Import processed',
                metaData: resultCust
            }).send(res);
            break;

        case 'supplier':
            const supplierRowsParsed = await this.excelService.parseExcel(file.buffer, (row) => {
                return {
                    code: row.getCell(1).text,
                    name: row.getCell(2).text,
                    contactPerson: row.getCell(3).text,
                    phone: row.getCell(4).text,
                    email: row.getCell(5).text,
                    address: row.getCell(6).text,
                    city: row.getCell(7).text,
                    category: row.getCell(8).text,
                    // totalDebt: row.getCell(9).value, // Not importing debt usually
                    status: row.getCell(10).text,
                };
            });

            const resultSupplier = await supplierService.importSuppliers(supplierRowsParsed);

            new SuccessResponse({
                message: 'Import processed',
                metaData: resultSupplier
            }).send(res);
            break;

        case 'staff':
            const staffRowsParsed = await this.excelService.parseExcel(file.buffer, (row) => {
                return {
                    fullName: row.getCell(1).text,
                    phone: row.getCell(2).text,
                    email: row.getCell(3).text,
                    idCard: row.getCell(4).text,
                    position: row.getCell(5).text,
                    department: row.getCell(6).text,
                    gender: row.getCell(7).text,
                    birthday: row.getCell(8).value, // date can be object
                    hireDate: row.getCell(9).value,
                    baseRate: row.getCell(10).value,
                    salaryType: row.getCell(11).text,
                    address: row.getCell(12).text,
                    city: row.getCell(13).text,
                };
            });

            const resultStaff = await staffService.importStaff(staffRowsParsed);

            new SuccessResponse({
                message: 'Import processed',
                metaData: resultStaff
            }).send(res);
            break;

        default:
            throw new BadRequestError({ message: 'Module not found or not supported for import' })
    }
  }
}

export const exportImportController = new ExportImportController()
