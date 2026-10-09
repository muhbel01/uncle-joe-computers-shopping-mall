-- Seed the initial product category navigation.
insert into public.categories (name, slug, description, sort_order, is_active) values
('Computers & Laptops','computers-laptops','Desktop computers, laptops and computing essentials.',1,true),
('Phones & Tablets','phones-tablets','Smartphones, tablets and mobile devices.',2,true),
('Printers & Office','printers-office','Printers, ink, paper and office technology.',3,true),
('Accessories','accessories','Computer accessories, keyboards, mice and peripherals.',4,true),
('Networking','networking','Routers, switches, access points and network equipment.',5,true),
('CCTV & Security','cctv-security','Cameras, recorders and security equipment.',6,true),
('Gaming & Entertainment','gaming-entertainment','Gaming equipment, TVs and audio products.',7,true),
('Storage & Memory','storage-memory','SSDs, hard drives, flash drives and memory.',8,true),
('Power & Solar','power-solar','Power banks, chargers, UPS and solar-related products.',9,true),
('Smart Home','smart-home','Smart devices and home automation accessories.',10,true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
