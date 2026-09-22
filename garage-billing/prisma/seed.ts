import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const parts = [
  { barcode: "8901030826017", name: "Engine Oil 20W-40 (1L)", make: "Castrol", category: "Oil", costPrice: 260, sellingPrice: 340, quantity: 40 },
  { barcode: "8901030826024", name: "Front Brake Shoe Set", make: "Bajaj OEM", category: "Brake", costPrice: 180, sellingPrice: 260, quantity: 15 },
  { barcode: "8901030826031", name: "Rear Brake Caliper Assembly", make: "Bosch", category: "Brake", costPrice: 950, sellingPrice: 1350, quantity: 4 },
  { barcode: "8901030826048", name: "Spark Plug", make: "NGK", category: "Engine", costPrice: 90, sellingPrice: 150, quantity: 30 },
  { barcode: "8901030826055", name: "Piston Kit (Standard Bore)", make: "Bajaj OEM", category: "Engine", costPrice: 1200, sellingPrice: 1650, quantity: 3 },
  { barcode: "8901030826062", name: "Fuel Filter", make: "Bosch", category: "Fuel", costPrice: 110, sellingPrice: 180, quantity: 12 },
  { barcode: "8901030826079", name: "Chain Sprocket Kit", make: "Rollon", category: "Drivetrain", costPrice: 850, sellingPrice: 1200, quantity: 6 },
  { barcode: "8901030826086", name: "Air Filter", make: "K&N", category: "Engine", costPrice: 300, sellingPrice: 450, quantity: 10 },
  { barcode: "8901030826093", name: "Clutch Plate Set", make: "Bajaj OEM", category: "Engine", costPrice: 400, sellingPrice: 600, quantity: 8 },
  { barcode: "8901030826109", name: "Self-tapping Screw M5x20 (pack of 10)", make: "Generic", category: "Fastener", costPrice: 20, sellingPrice: 40, quantity: 100 },
  { barcode: "8901030826116", name: "Headlight Bulb 12V 35/35W", make: "Philips", category: "Electrical", costPrice: 70, sellingPrice: 120, quantity: 20 },
  { barcode: "8901030826123", name: "Battery 12V 5Ah", make: "Exide", category: "Electrical", costPrice: 900, sellingPrice: 1300, quantity: 5 },
];

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@sparksgarage.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: "Garage Admin", passwordHash },
  });
  console.log(
    `Admin login ready -> email: ${adminEmail}, password: ${
      process.env.ADMIN_PASSWORD ? "(from ADMIN_PASSWORD env)" : adminPassword
    }`
  );

  for (const part of parts) {
    const created = await prisma.sparePart.upsert({
      where: { barcode: part.barcode },
      update: {},
      create: part,
    });
    const existingTxn = await prisma.inventoryTxn.findFirst({ where: { sparePartId: created.id } });
    if (!existingTxn) {
      await prisma.inventoryTxn.create({
        data: { sparePartId: created.id, type: "IN", quantity: part.quantity, note: "Seed stock" },
      });
    }
  }

  const customer = await prisma.customer.upsert({
    where: { phone: "9876543210" },
    update: {},
    create: {
      name: "Ravi Kumar",
      phone: "9876543210",
      address: "12 MG Road, Bengaluru",
      vehicles: {
        create: [{ make: "Bajaj", model: "Pulsar 150", regNumber: "KA-01-AB-1234" }],
      },
    },
  });

  console.log(`Seeded ${parts.length} spare parts and demo customer ${customer.name}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
