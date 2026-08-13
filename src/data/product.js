import service1 from '../../assets/products/1p.png';
import service2 from '../../assets/products/2p.png';
import service3 from '../../assets/products/3p.jpg';
import service4 from '../../assets/products/4p.jpg';

export const products = [
  {
    id: 1,
    name: 'APFC Panel',
    slug: 'apfc-panel',
    image: service1,
    description: 'Advanced Power Factor Correction panels for optimal electrical efficiency.',
    detailedDescription: 'Our APFC (Automatic Power Factor Correction) panels are designed to automatically maintain the power factor of electrical systems close to unity. These panels help reduce electricity bills, improve system efficiency, and comply with utility regulations.',
    features: [
      'Automatic power factor correction',
      'Real-time monitoring system',
      'Energy savings up to 30%',
      'Smart load management',
      'Digital display and control',
      'Overload and short circuit protection',
      'Modular capacitor design',
      'Remote monitoring capability'
    ],
    specifications: {
      'Voltage Range': '415V ±10%',
      'Frequency': '50Hz ±5%',
      'Power Factor': '0.95 to 1.0',
      'Control': 'Microprocessor based',
      'Display': 'LCD with backlight',
      'Protection': 'IP54 rated enclosure'
    },
    applications: [
      'Industrial power systems',
      'Commercial buildings',
      'Manufacturing units',
      'Data centers',
      'Hospitals and healthcare facilities'
    ]
  },
  {
    id: 2,
    name: 'Customise 3-Phase Motor Winding',
    slug: 'customise-3-phase-motor-winding',
    image: service2,
    description: 'Professional motor winding services with precision and reliability.',
    detailedDescription: 'Our specialized 3-phase motor winding services ensure optimal performance and extended motor life. We use high-grade materials and precision techniques to deliver custom winding solutions for various industrial applications.',
    features: [
      'Custom winding specifications',
      'High-grade materials',
      'Extended motor life',
      'Performance optimization',
      'Precision winding techniques',
      'Quality testing and validation',
      'Expert craftsmanship',
      'Warranty on workmanship'
    ],
    specifications: {
      'Motor Types': 'Induction, Synchronous, DC',
      'Power Range': '0.5 HP to 500 HP',
      'Voltage': '220V to 11kV',
      'Insulation Class': 'F, H class available',
      'Winding Material': 'Copper/Aluminum',
      'Testing': 'Megger, Hi-pot, Surge test'
    },
    applications: [
      'Industrial machinery',
      'Pump motors',
      'Compressor motors',
      'Fan and blower motors',
      'Crane and hoist motors'
    ]
  },
  {
    id: 3,
    name: 'Modern DC Starter for Power loom',
    slug: 'modern-dc-starter-power-loom',
    image: service3,
    description: 'State-of-the-art DC starters designed specifically for power loom applications.',
    detailedDescription: 'Our modern DC starters are engineered for power loom applications, providing smooth operation, energy efficiency, and reliable performance. These starters ensure optimal control and protection for textile machinery.',
    features: [
      'Smooth start operation',
      'Overload protection',
      'Digital control interface',
      'Energy efficient design',
      'Variable speed control',
      'Soft start/stop functionality',
      'Real-time monitoring',
      'Easy maintenance'
    ],
    specifications: {
      'Input Voltage': '220V AC',
      'Output Voltage': '0-220V DC',
      'Power Range': '1 HP to 50 HP',
      'Control': 'Microprocessor based',
      'Display': 'Digital LED display',
      'Protection': 'IP65 rated'
    },
    applications: [
      'Power loom machines',
      'Textile manufacturing',
      'Weaving units',
      'Industrial DC motors',
      'Variable speed applications'
    ]
  },
  {
    id: 4,
    name: 'Advanced Control Panel and Automation',
    slug: 'advanced-control-panel-automation',
    image: service4,
    description: 'Comprehensive automation solutions for industrial control systems.',
    detailedDescription: 'Our advanced control panels and automation solutions provide complete industrial control capabilities. From simple motor control to complex process automation, we deliver reliable and efficient control systems.',
    features: [
      'PLC integration',
      'Touch screen interface',
      'Remote monitoring',
      'Custom automation logic',
      'SCADA integration',
      'Data logging and analysis',
      'Alarm and event management',
      'Modular design'
    ],
    specifications: {
      'Control System': 'PLC/SCADA based',
      'Display': 'Touch screen HMI',
      'Communication': 'Ethernet, Modbus, Profibus',
      'I/O Capacity': 'Up to 1000 points',
      'Power Supply': '24V DC, 110V/220V AC',
      'Enclosure': 'IP65 stainless steel'
    },
    applications: [
      'Process industries',
      'Manufacturing automation',
      'Water treatment plants',
      'Power generation',
      'Building automation'
    ]
  }
];

export const getProductBySlug = (slug) => {
  return products.find(product => product.slug === slug);
};

export const getProductById = (id) => {
  return products.find(product => product.id === parseInt(id));
};
