// Official Magic Brew menu (from the café's menu boards and posters).
// Bump MENU_VERSION when this list changes: server.js re-applies it once on the next request.
// Photos are in public/img/menu/<image>.webp
const MENU_VERSION = 1;

const OWNER_NAME = 'Akshay Khaire';

const CATEGORIES = [
  ['rolls', 'Rolls'],
  ['pulav', 'Tava Pulav & Rice'],
  ['sandwiches', 'Sandwiches'],
  ['pasta', 'Pasta'],
  ['burgers', 'Burgers'],
  ['maggi', 'Maggi'],
  ['fries', 'Fries'],
  ['sides', 'Sides'],
  ['desserts', 'Desserts'],
  ['icecream', 'Ice Cream'],
  ['tea', 'Tea'],
  ['coffee', 'Coffee'],
  ['mojito', 'Mojito'],
];

// [category, id, name, price, image, description]
const ITEMS = [
  ['rolls', 'roll-paneer', 'Paneer Roll', 150, 'roll-paneer'],
  ['rolls', 'roll-veggie', 'Veggie Roll', 150, 'roll-veggie'],
  ['rolls', 'roll-egg', 'Egg Roll', 150, 'roll-egg'],
  ['rolls', 'roll-chicken', 'Chicken Roll', 180, 'roll-chicken'],
  ['rolls', 'roll-tandoori', 'Tandoori Chicken Chap Roll', 180, 'roll-tandoori'],
  ['rolls', 'roll-tikka', 'Chicken Tikka Roll', 180, 'roll-tikka'],

  ['pulav', 'pulav-veg', 'Veg Tava Pulav', 180, 'pulav-veg'],
  ['pulav', 'pulav-paneer', 'Paneer Tava Pulav', 200, 'pulav-paneer'],
  ['pulav', 'rice-chicken', 'Chicken Rice', 220, 'rice-chicken'],
  ['pulav', 'rice-egg', 'Egg Rice', 220, 'rice-egg'],

  ['sandwiches', 'sw-cheese-pizza', 'Cheese Pizza Sandwich', 140, 'sw-cheese-pizza'],
  ['sandwiches', 'sw-chocolate', 'Chocolate Sandwich', 120, 'sw-chocolate'],
  ['sandwiches', 'sw-egg', 'Egg Sandwich', 140, 'sw-egg'],
  ['sandwiches', 'sw-korean', 'Spicy Korean Paneer Sandwich', 180, 'sw-korean'],
  ['sandwiches', 'sw-volcano', 'Volcano Sandwich', 200, 'sw-volcano'],
  ['sandwiches', 'sw-chitpola', 'Chicken Chitpola Melt Sandwich', 220, 'sw-chitpola'],

  ['pasta', 'pasta-white', 'White Sauce Pasta', 180, 'pasta-white', 'Creamy, cheesy, delicious.'],
  ['pasta', 'pasta-red', 'Red Sauce Pasta', 180, 'pasta-red', 'Creamy, cheesy, delicious.'],
  ['pasta', 'pasta-chicken', 'Chicken Pasta', 220, 'pasta-chicken', 'Creamy, cheesy, delicious.'],
  ['pasta', 'pasta-veggie', 'Veggie Pasta', 180, 'pasta-veggie', 'Creamy, cheesy, delicious.'],

  ['burgers', 'burger-sz-chicken', 'Sizzling Cheese Chicken Burger', 280, 'burger-sz-chicken', 'Hot & sizzling with rich cheese sauce and a juicy chicken patty.'],
  ['burgers', 'burger-sz-paneer', 'Sizzling Cheese Paneer Burger', 280, 'burger-sz-paneer', 'Hot & sizzling with rich cheese sauce and a rich paneer patty.'],
  ['burgers', 'burger-nuggets', 'Crunchy Chicken Nuggets Burger', 180, 'burger-nuggets'],
  ['burgers', 'burger-paneer', 'Paneer Burger', 150, 'burger-paneer'],

  ['maggi', 'maggi-plain', 'Plain Maggi', 80, 'maggi-plain'],
  ['maggi', 'maggi-butter', 'Butter Garlic Maggi', 100, 'maggi-butter'],
  ['maggi', 'maggi-chilli', 'Chilli Cheese Corn Maggi', 120, 'maggi-chilli'],
  ['maggi', 'maggi-masala', 'Masala Cheese Maggi', 120, 'maggi-masala'],

  ['fries', 'fries-french', 'French Fries', 120, 'fries-french'],
  ['fries', 'fries-peri', 'Peri Peri Fries', 130, 'fries-peri'],
  ['fries', 'fries-paneer', 'Paneer Loaded Fries Bowl', 160, 'fries-paneer'],
  ['fries', 'fries-cheese', 'Cheese Loaded Fries Bowl', 160, 'fries-cheese'],
  ['fries', 'fries-chicken', 'Chicken Loaded Fries Bowl', 180, 'fries-chicken'],

  ['sides', 'side-bun', 'Cheese Garlic Bun', 180, 'side-bun', 'Easy Korean bakery bread. Cheesy, garlicky, soft & fresh.'],
  ['sides', 'side-nuggets', 'Chicken Nuggets', 160, 'side-nuggets'],
  ['sides', 'side-popcorn', 'Chicken Popcorn', 140, 'side-popcorn'],
  ['sides', 'side-potato', 'Potato Cheese Ball', 140, 'side-potato'],

  ['desserts', 'dessert-brownie', 'Sizzling Chocolate Brownie', 250, 'dessert-brownie', 'Hot fudge heaven, served with vanilla ice cream.'],
  ['desserts', 'dessert-lava', 'Choco Lava Cake', 180, 'dessert-lava', 'Melts in your mouth.'],
  ['desserts', 'dessert-mug-choc', 'Chocolate Mug Cake', 150, 'dessert-mug-choc', 'Warm & chocolaty.'],
  ['desserts', 'dessert-mug-vanilla', 'Vanilla Mug Cake', 150, 'dessert-mug-vanilla', 'Vanilla love.'],
  ['desserts', 'dessert-mug-nutella', 'Nutella Mug Cake', 150, 'dessert-mug-nutella', 'Hazelnut dream.'],
  ['desserts', 'dessert-bowl-choc', 'Chocolate Bowl', 250, 'dessert-bowl-choc', "Choco lover's paradise."],
  ['desserts', 'dessert-bowl-kitkat', 'KitKat Chocolate Bowl', 250, 'dessert-bowl-kitkat', 'Crunchy & yummy.'],

  ['icecream', 'ice-single', 'Single Scoop', 60, 'ice-single', 'Scoops of happiness.'],
  ['icecream', 'ice-double', 'Double Scoop', 100, 'ice-double', 'Scoops of happiness.'],

  ['tea', 'tea-tea', 'Tea', 50, 'tea-tea'],
  ['tea', 'tea-peach', 'Peach Ice Tea', 70, 'tea-peach'],
  ['tea', 'tea-lemon', 'Lemon Ice Tea', 50, 'tea-lemon'],
  ['tea', 'tea-green', 'Green Tea', 50, 'tea-green'],

  // The menu board lists two prices for these (60 / 70 and 70 / 80), so each price is its own orderable item.
  ['coffee', 'coffee-cold-60', 'Cold Coffee w/ Crush (₹60)', 60, 'coffee-cold'],
  ['coffee', 'coffee-cold-70', 'Cold Coffee w/ Crush (₹70)', 70, 'coffee-cold'],
  ['coffee', 'coffee-thick-70', 'Thick Cold Coffee w/ Crush (₹70)', 70, 'coffee-thick'],
  ['coffee', 'coffee-thick-80', 'Thick Cold Coffee w/ Crush (₹80)', 80, 'coffee-thick'],
  ['coffee', 'coffee-black', 'Black Coffee', 50, 'coffee-black'],
  ['coffee', 'coffee-espresso', 'Espresso', 150, 'coffee-espresso'],
  ['coffee', 'coffee-americano', 'Americano', 180, 'coffee-americano'],
  ['coffee', 'coffee-cappuccino', 'Cappuccino', 180, 'coffee-cappuccino'],
  ['coffee', 'coffee-latte', 'Latte', 180, 'coffee-latte'],
  ['coffee', 'coffee-iced', 'Iced Coffee', 180, 'coffee-iced'],

  ['mojito', 'mojito-virgin', 'Virgin Mojito', 150, 'mojito-virgin'],
  ['mojito', 'mojito-blue', 'Blue Lagoon', 150, 'mojito-blue'],
  ['mojito', 'mojito-blueberry', 'Blueberry', 150, 'mojito-blueberry'],
  ['mojito', 'mojito-apple', 'Green Apple', 150, 'mojito-apple'],
];

function buildMenu() {
  return {
    categories: CATEGORIES.map(([id, name], i) => ({ id: 'c-' + id, name, order: i })),
    items: ITEMS.map(([cat, id, name, price, image, description]) => ({
      id, categoryId: 'c-' + cat, name, price,
      description: description || '', image: `/img/menu/${image}.webp`, available: true,
    })),
  };
}

// Replace the menu once per MENU_VERSION; orders and payment settings are untouched. Returns true if db changed.
function applyMenu(db) {
  let changed = false;
  if (db.menuVersion !== MENU_VERSION) {
    Object.assign(db, buildMenu(), { menuVersion: MENU_VERSION });
    changed = true;
  }
  if (!db.settings.ownerName) { db.settings.ownerName = OWNER_NAME; changed = true; }
  return changed;
}

module.exports = { MENU_VERSION, buildMenu, applyMenu, OWNER_NAME };
