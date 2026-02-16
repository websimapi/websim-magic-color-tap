// Helper to generate 100 presets using available assets
window.generatePresets = () => {
    const baseAssets = [
        { src: 'preset_pizza.png', label: 'Pizza', tags: ['food', 'lunch', 'yummy'] },
        { src: 'preset_cat.png', label: 'Cat', tags: ['animal', 'pet', 'cute', 'kitten'] },
        { src: 'preset_flower.png', label: 'Flower', tags: ['nature', 'plant', 'garden'] },
        { src: 'preset_car.png', label: 'Car', tags: ['vehicle', 'transport', 'fast'] },
        { src: 'preset_house.png', label: 'House', tags: ['building', 'home', 'cottage'] },
        { src: 'preset_robot.png', label: 'Robot', tags: ['tech', 'scifi', 'toy'] },
        { src: 'preset_unicorn.png', label: 'Unicorn', tags: ['fantasy', 'magic', 'horse'] },
        { src: 'preset_cupcake.png', label: 'Cupcake', tags: ['food', 'dessert', 'sweet'] },
        { src: 'preset_butterfly.png', label: 'Butterfly', tags: ['insect', 'nature', 'fly'] },
        { src: 'preset_dino.png', label: 'Dino', tags: ['animal', 'prehistoric', 'rex'] },
        // New Assets
        { src: 'preset_rocket.png', label: 'Rocket', tags: ['space', 'fly', 'scifi'] },
        { src: 'preset_turtle.png', label: 'Turtle', tags: ['animal', 'ocean', 'slow'] },
        { src: 'preset_castle.png', label: 'Castle', tags: ['fantasy', 'building', 'royal'] },
        { src: 'preset_dragon.png', label: 'Dragon', tags: ['fantasy', 'monster', 'fire'] },
        { src: 'preset_icecream.png', label: 'Ice Cream', tags: ['food', 'dessert', 'summer'] },
        { src: 'preset_sun.png', label: 'Sun', tags: ['nature', 'sky', 'hot'] },
        { src: 'preset_fish.png', label: 'Fish', tags: ['animal', 'ocean', 'water'] },
        { src: 'preset_bird.png', label: 'Bird', tags: ['animal', 'fly', 'sky'] },
        { src: 'preset_tree.png', label: 'Tree', tags: ['nature', 'plant', 'fruit'] },
        { src: 'preset_plane.png', label: 'Plane', tags: ['vehicle', 'fly', 'transport'] },
        // Set 3 (21-30)
        { src: 'preset_balloon.png', label: 'Balloon', tags: ['sky', 'fly', 'travel'] },
        { src: 'preset_bear.png', label: 'Bear', tags: ['animal', 'cute', 'forest'] },
        { src: 'preset_train.png', label: 'Train', tags: ['vehicle', 'transport', 'toy'] },
        { src: 'preset_rainbow.png', label: 'Rainbow', tags: ['nature', 'sky', 'weather'] },
        { src: 'preset_guitar.png', label: 'Guitar', tags: ['music', 'instrument', 'song'] },
        { src: 'preset_octopus.png', label: 'Octopus', tags: ['animal', 'ocean', 'water'] },
        { src: 'preset_mushroom.png', label: 'Mushroom', tags: ['nature', 'plant', 'forest'] },
        { src: 'preset_snowman.png', label: 'Snowman', tags: ['winter', 'snow', 'cold'] },
        { src: 'preset_boat.png', label: 'Boat', tags: ['vehicle', 'water', 'ocean'] },
        { src: 'preset_burger.png', label: 'Burger', tags: ['food', 'lunch', 'yummy'] },
        // Set 4 (31-40)
        { src: 'preset_basketball.png', label: 'Basketball', tags: ['sport', 'play', 'ball'] },
        { src: 'preset_ufo.png', label: 'UFO', tags: ['space', 'scifi', 'alien'] },
        { src: 'preset_owl.png', label: 'Owl', tags: ['animal', 'bird', 'night'] },
        { src: 'preset_crown.png', label: 'Crown', tags: ['fantasy', 'royal', 'king'] },
        { src: 'preset_diamond.png', label: 'Diamond', tags: ['treasure', 'gem', 'shiny'] },
        { src: 'preset_cake.png', label: 'Cake', tags: ['food', 'dessert', 'party'] },
        { src: 'preset_robot_dog.png', label: 'Robo Dog', tags: ['tech', 'animal', 'scifi'] },
        { src: 'preset_planet.png', label: 'Planet', tags: ['space', 'universe', 'stars'] },
        { src: 'preset_anchor.png', label: 'Anchor', tags: ['ocean', 'boat', 'sea'] },
        { src: 'preset_key.png', label: 'Key', tags: ['object', 'mystery', 'lock'] },
        // Set 5 (41-50)
        { src: 'preset_apple.png', label: 'Apple', tags: ['food', 'fruit', 'red'] },
        { src: 'preset_duck.png', label: 'Duck', tags: ['animal', 'bird', 'water'] },
        { src: 'preset_hat.png', label: 'Hat', tags: ['clothing', 'magic', 'wear'] },
        { src: 'preset_moon.png', label: 'Moon', tags: ['space', 'night', 'sleep'] },
        { src: 'preset_shoe.png', label: 'Shoe', tags: ['clothing', 'walk', 'run'] },
        { src: 'preset_bell.png', label: 'Bell', tags: ['object', 'music', 'sound'] },
        { src: 'preset_book.png', label: 'Book', tags: ['object', 'read', 'school'] },
        { src: 'preset_camera.png', label: 'Camera', tags: ['object', 'photo', 'picture'] },
        { src: 'preset_ghost.png', label: 'Ghost', tags: ['fantasy', 'spooky', 'halloween'] },
        { src: 'preset_star.png', label: 'Star', tags: ['space', 'sky', 'shine'] },
        // Set 6 (51-60)
        { src: 'preset_bee.png', label: 'Bee', tags: ['insect', 'nature', 'honey'] },
        { src: 'preset_ladybug.png', label: 'Ladybug', tags: ['insect', 'nature', 'red'] },
        { src: 'preset_snail.png', label: 'Snail', tags: ['animal', 'garden', 'shell'] },
        { src: 'preset_dolphin.png', label: 'Dolphin', tags: ['animal', 'ocean', 'swim'] },
        { src: 'preset_crab.png', label: 'Crab', tags: ['animal', 'beach', 'ocean'] },
        { src: 'preset_whale.png', label: 'Whale', tags: ['animal', 'ocean', 'big'] },
        { src: 'preset_fox.png', label: 'Fox', tags: ['animal', 'forest', 'orange'] },
        { src: 'preset_koala.png', label: 'Koala', tags: ['animal', 'australia', 'cute'] },
        { src: 'preset_lion.png', label: 'Lion', tags: ['animal', 'safari', 'king'] },
        { src: 'preset_tiger.png', label: 'Tiger', tags: ['animal', 'safari', 'stripes'] },
        // Set 7 (61-70)
        { src: 'preset_penguin.png', label: 'Penguin', tags: ['animal', 'arctic', 'cute'] },
        { src: 'preset_giraffe.png', label: 'Giraffe', tags: ['animal', 'safari', 'tall'] },
        { src: 'preset_elephant.png', label: 'Elephant', tags: ['animal', 'safari', 'big'] },
        { src: 'preset_hedgehog.png', label: 'Hedgehog', tags: ['animal', 'forest', 'spiky'] },
        { src: 'preset_seahorse.png', label: 'Seahorse', tags: ['animal', 'ocean', 'swim'] },
        { src: 'preset_parrot.png', label: 'Parrot', tags: ['animal', 'bird', 'color'] },
        { src: 'preset_zebra.png', label: 'Zebra', tags: ['animal', 'safari', 'stripes'] },
        { src: 'preset_panda.png', label: 'Panda', tags: ['animal', 'cute', 'china'] },
        { src: 'preset_frog.png', label: 'Frog', tags: ['animal', 'pond', 'jump'] },
        { src: 'preset_squirrel.png', label: 'Squirrel', tags: ['animal', 'forest', 'nut'] },
        // Set 8 (71-80)
        { src: 'preset_cow.png', label: 'Cow', tags: ['animal', 'farm', 'milk'] },
        { src: 'preset_pig.png', label: 'Pig', tags: ['animal', 'farm', 'pink'] },
        { src: 'preset_sheep.png', label: 'Sheep', tags: ['animal', 'farm', 'wool'] },
        { src: 'preset_chicken.png', label: 'Chicken', tags: ['animal', 'farm', 'egg'] },
        { src: 'preset_monkey.png', label: 'Monkey', tags: ['animal', 'jungle', 'climb'] },
        { src: 'preset_snake.png', label: 'Snake', tags: ['animal', 'wild', 'reptile'] },
        { src: 'preset_camel.png', label: 'Camel', tags: ['animal', 'desert', 'hump'] },
        { src: 'preset_kangaroo.png', label: 'Kangaroo', tags: ['animal', 'australia', 'jump'] },
        { src: 'preset_bat.png', label: 'Bat', tags: ['animal', 'night', 'fly'] },
        { src: 'preset_shark.png', label: 'Shark', tags: ['animal', 'ocean', 'swim'] },
    ];

    const adjectives = ['Super', 'Happy', 'Magic', 'Little', 'Big', 'Funny', 'Cool', 'Wild', 'Space', 'Rainbow'];
    let list = [];
    let id = 1;

    // Add base items first
    baseAssets.forEach(a => list.push({ ...a, id: id++, label: a.label }));

    // Generate variations to reach ~100
    for (let i = 0; i < 9; i++) {
        baseAssets.forEach(asset => {
            list.push({
                id: id++,
                src: asset.src,
                label: `${adjectives[i]} ${asset.label}`,
                tags: asset.tags
            });
        });
    }
    
    return list;
};

window.PRESETS = window.generatePresets();