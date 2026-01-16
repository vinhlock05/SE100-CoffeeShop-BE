import { prisma } from "~/config"

export default async function seedSuppliers() {
  const data = [
    {
      code: "NCC001",
      name: "Trung Nguyên",
      contactPerson: "Nguyễn Văn A",
      phone: "0281234567",
      email: "contact@trungnguyen.com",
      address: "123 Nguyễn Huệ",
      city: "Hồ Chí Minh",
      category: "Cà phê",
    },
    {
      code: "NCC002",
      name: "Vinamilk",
      contactPerson: "Trần Thị B",
      phone: "0287654321",
      email: "sales@vinamilk.com.vn",
      address: "10 Tân Trào",
      city: "Hồ Chí Minh",
      category: "Sữa & Kem",
    },
    {
      code: "NCC003",
      name: "Bao Bì An Phát",
      contactPerson: "Lê Văn C",
      phone: "02411223344",
      email: "contact@anphatpack.vn",
      address: "50 KCN Bắc Thăng Long",
      city: "Hà Nội",
      category: "Bao bì",
    },
  ]

  const result = []

  for (const item of data) {
    const supplier = await prisma.supplier.upsert({
      where: { code: item.code },
      update: item,
      create: item,
    })

    result.push(supplier)
  }

  return result
}
