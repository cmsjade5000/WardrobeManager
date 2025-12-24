import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create tags
  const casualTag = await prisma.tag.upsert({
    where: { name: 'Casual' },
    update: {},
    create: { name: 'Casual' },
  });

  const workTag = await prisma.tag.upsert({
    where: { name: 'Work' },
    update: {},
    create: { name: 'Work' },
  });

  const summerTag = await prisma.tag.upsert({
    where: { name: 'Summer' },
    update: {},
    create: { name: 'Summer' },
  });

  const winterTag = await prisma.tag.upsert({
    where: { name: 'Winter' },
    update: {},
    create: { name: 'Winter' },
  });

  const formalTag = await prisma.tag.upsert({
    where: { name: 'Formal' },
    update: {},
    create: { name: 'Formal' },
  });

  const dateNightTag = await prisma.tag.upsert({
    where: { name: 'Date Night' },
    update: {},
    create: { name: 'Date Night' },
  });

  // Create sample items
  const items = [
    {
      name: 'Classic White Oxford Shirt',
      type: 'TOP',
      category: 'Shirt',
      color: 'White',
      imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
      brand: 'Brooks Brothers',
      size: 'M',
      material: 'Cotton',
      notes: 'Perfect for work or casual wear',
      tags: [workTag.id, casualTag.id],
    },
    {
      name: 'Navy Blue Blazer',
      type: 'OUTERWEAR',
      category: 'Blazer',
      color: 'Navy',
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
      brand: 'Hugo Boss',
      size: 'L',
      material: 'Wool Blend',
      notes: 'Great for business meetings',
      tags: [workTag.id, formalTag.id],
    },
    {
      name: 'Slim Fit Dark Jeans',
      type: 'BOTTOM',
      category: 'Jeans',
      color: 'Dark Blue',
      imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80',
      brand: "Levi's",
      size: '32',
      material: 'Denim',
      notes: 'Versatile everyday jeans',
      tags: [casualTag.id],
    },
    {
      name: 'Black Leather Chelsea Boots',
      type: 'SHOES',
      category: 'Boots',
      color: 'Black',
      imageUrl: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800&q=80',
      brand: 'Cole Haan',
      size: '10',
      material: 'Leather',
      notes: 'Dress up or down',
      tags: [formalTag.id, dateNightTag.id],
    },
    {
      name: 'Cashmere V-Neck Sweater',
      type: 'TOP',
      category: 'Sweater',
      color: 'Burgundy',
      imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80',
      brand: 'J.Crew',
      size: 'M',
      material: 'Cashmere',
      notes: 'Luxuriously soft',
      tags: [winterTag.id, dateNightTag.id],
    },
    {
      name: 'Striped Linen Shirt',
      type: 'TOP',
      category: 'Shirt',
      color: 'Blue/White Stripe',
      imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
      brand: 'Uniqlo',
      size: 'M',
      material: 'Linen',
      notes: 'Perfect for summer',
      tags: [summerTag.id, casualTag.id],
    },
    {
      name: 'Tailored Chinos',
      type: 'BOTTOM',
      category: 'Chinos',
      color: 'Khaki',
      imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80',
      brand: 'Bonobos',
      size: '32',
      material: 'Cotton Twill',
      notes: 'Business casual staple',
      tags: [workTag.id, casualTag.id],
    },
    {
      name: 'Minimalist Leather Watch',
      type: 'ACCESSORY',
      category: 'Watch',
      color: 'Silver/Brown',
      imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80',
      brand: 'Daniel Wellington',
      size: 'One Size',
      material: 'Stainless Steel/Leather',
      notes: 'Goes with everything',
      tags: [workTag.id, formalTag.id, casualTag.id],
    },
    // Additional 15 items
    {
      name: 'Black Midi Dress',
      type: 'ONE_PIECE',
      category: 'Dress',
      color: 'Black',
      imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',
      brand: 'Zara',
      size: 'S',
      material: 'Viscose',
      notes: 'Elegant and versatile',
      tags: [formalTag.id, dateNightTag.id],
    },
    {
      name: 'Denim Jacket',
      type: 'OUTERWEAR',
      category: 'Jacket',
      color: 'Light Blue',
      imageUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=80',
      brand: 'Gap',
      size: 'M',
      material: 'Denim',
      notes: 'Classic layering piece',
      tags: [casualTag.id, summerTag.id],
    },
    {
      name: 'White Canvas Sneakers',
      type: 'SHOES',
      category: 'Sneakers',
      color: 'White',
      imageUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80',
      brand: 'Common Projects',
      size: '10',
      material: 'Canvas/Leather',
      notes: 'Clean everyday sneakers',
      tags: [casualTag.id, summerTag.id],
    },
    {
      name: 'Wool Peacoat',
      type: 'OUTERWEAR',
      category: 'Coat',
      color: 'Charcoal',
      imageUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&q=80',
      brand: 'J.Crew',
      size: 'L',
      material: 'Wool',
      notes: 'Warm and stylish for winter',
      tags: [winterTag.id, formalTag.id],
    },
    {
      name: 'Leather Belt',
      type: 'ACCESSORY',
      category: 'Belt',
      color: 'Brown',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
      brand: 'Allen Edmonds',
      size: '34',
      material: 'Full Grain Leather',
      notes: 'Quality everyday belt',
      tags: [workTag.id, casualTag.id],
    },
    {
      name: 'Floral Summer Dress',
      type: 'ONE_PIECE',
      category: 'Dress',
      color: 'Multicolor',
      imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80',
      brand: 'Reformation',
      size: 'S',
      material: 'Cotton',
      notes: 'Perfect for summer outings',
      tags: [summerTag.id, casualTag.id],
    },
    {
      name: 'Khaki Shorts',
      type: 'BOTTOM',
      category: 'Shorts',
      color: 'Khaki',
      imageUrl: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80',
      brand: 'J.Crew',
      size: '32',
      material: 'Cotton',
      notes: 'Summer essential',
      tags: [summerTag.id, casualTag.id],
    },
    {
      name: 'Leather Tote Bag',
      type: 'ACCESSORY',
      category: 'Bag',
      color: 'Tan',
      imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80',
      brand: 'Madewell',
      size: 'One Size',
      material: 'Leather',
      notes: 'Spacious work bag',
      tags: [workTag.id, casualTag.id],
    },
    {
      name: 'Printed Silk Scarf',
      type: 'ACCESSORY',
      category: 'Scarf',
      color: 'Red/Gold',
      imageUrl: 'https://images.unsplash.com/photo-1584030373081-f37408c1c8af?w=800&q=80',
      brand: 'Hermès',
      size: 'One Size',
      material: 'Silk',
      notes: 'Luxurious accent piece',
      tags: [formalTag.id, dateNightTag.id],
    },
    {
      name: 'Gray Crewneck T-Shirt',
      type: 'TOP',
      category: 'T-Shirt',
      color: 'Gray',
      imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
      brand: 'Everlane',
      size: 'M',
      material: 'Organic Cotton',
      notes: 'Everyday basic',
      tags: [casualTag.id],
    },
    {
      name: 'Black Wool Trousers',
      type: 'BOTTOM',
      category: 'Trousers',
      color: 'Black',
      imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80',
      brand: 'Theory',
      size: '32',
      material: 'Wool Blend',
      notes: 'Dress pants for formal occasions',
      tags: [workTag.id, formalTag.id],
    },
    {
      name: 'Suede Loafers',
      type: 'SHOES',
      category: 'Loafers',
      color: 'Tan',
      imageUrl: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&q=80',
      brand: 'Tod\'s',
      size: '10',
      material: 'Suede',
      notes: 'Italian craftsmanship',
      tags: [casualTag.id, summerTag.id],
    },
    {
      name: 'Wool Fedora Hat',
      type: 'ACCESSORY',
      category: 'Hat',
      color: 'Camel',
      imageUrl: 'https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?w=800&q=80',
      brand: 'Stetson',
      size: 'M',
      material: 'Wool Felt',
      notes: 'Stylish fall accessory',
      tags: [winterTag.id, casualTag.id],
    },
    {
      name: 'Striped Polo Shirt',
      type: 'TOP',
      category: 'Polo',
      color: 'Navy/White',
      imageUrl: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&q=80',
      brand: 'Ralph Lauren',
      size: 'M',
      material: 'Cotton Piqué',
      notes: 'Classic preppy style',
      tags: [casualTag.id, summerTag.id],
    },
    {
      name: 'Black Crossbody Bag',
      type: 'ACCESSORY',
      category: 'Bag',
      color: 'Black',
      imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
      brand: 'Coach',
      size: 'One Size',
      material: 'Leather',
      notes: 'Compact and practical',
      tags: [casualTag.id, dateNightTag.id],
    },
  ];

  for (const item of items) {
    const { tags, ...itemData } = item;
    
    // Check if item already exists by name
    const existing = await prisma.item.findFirst({
      where: { name: item.name }
    });
    
    if (!existing) {
      await prisma.item.create({
        data: {
          ...itemData,
          tags: {
            create: tags.map(tagId => ({
              tag: { connect: { id: tagId } }
            }))
          }
        }
      });
      console.log(`✅ Created: ${item.name}`);
    } else {
      console.log(`⏭️  Skipped (exists): ${item.name}`);
    }
  }

  // Create a sample outfit
  const allItems = await prisma.item.findMany({ take: 3 });
  
  if (allItems.length >= 3) {
    const existingOutfit = await prisma.outfit.findFirst({
      where: { name: 'Business Casual Friday' }
    });
    
    if (!existingOutfit) {
      await prisma.outfit.create({
        data: {
          name: 'Business Casual Friday',
          notes: 'My go-to outfit for casual Fridays at work',
          items: {
            create: allItems.slice(0, 3).map((item, index) => ({
              position: index,
              item: { connect: { id: item.id } }
            }))
          }
        }
      });
      console.log('✅ Created outfit: Business Casual Friday');
    }
  }

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
