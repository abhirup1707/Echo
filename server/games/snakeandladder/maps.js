const MAPS = [
    {
        name: "Classic",
        ladders: [
            { from: 2, to: 23 },
            { from: 8, to: 34 },
            { from: 20, to: 77 },
            { from: 32, to: 68 },
            { from: 41, to: 79 },
            { from: 74, to: 88 },
            { from: 82, to: 100 },
            { from: 85, to: 95 }
        ],
        snakes: [
            { from: 97, to: 25 },
            { from: 92, to: 70 },
            { from: 86, to: 54 },
            { from: 62, to: 37 },
            { from: 53, to: 33 },
            { from: 47, to: 5 },
            { from: 38, to: 15 },
            { from: 29, to: 9 }
        ]
    },
    {
        name: "Classic II",
        ladders: [
            { from: 1, to: 38 },
            { from: 3, to: 22 },
            { from: 5, to: 8 },
            { from: 11, to: 26 },
            { from: 20, to: 29 },
            { from: 17, to: 74 },
            { from: 30, to: 40 },
            { from: 46, to: 63 },
            { from: 55, to: 72 },
            { from: 68, to: 86 }
        ],
        snakes: [
            { from: 25, to: 5 },
            { from: 34, to: 22 },
            { from: 43, to: 17 },
            { from: 50, to: 36 },
            { from: 58, to: 41 },
            { from: 66, to: 54 },
            { from: 77, to: 62 },
            { from: 85, to: 48 },
            { from: 92, to: 75 },
            { from: 99, to: 78 }
        ]
    },
    {
        name: "Express",
        ladders: [
            { from: 4, to: 14 },
            { from: 9, to: 31 },
            { from: 19, to: 38 },
            { from: 22, to: 40 },
            { from: 35, to: 56 },
            { from: 42, to: 63 },
            { from: 57, to: 76 },
            { from: 69, to: 89 },
            { from: 73, to: 94 }
        ],
        snakes: [
            { from: 18, to: 3 },
            { from: 30, to: 12 },
            { from: 45, to: 25 },
            { from: 53, to: 34 },
            { from: 61, to: 37 },
            { from: 79, to: 42 },
            { from: 88, to: 52 },
            { from: 95, to: 65 },
            { from: 99, to: 80 }
        ]
    },
    {
        name: "Pitfalls",
        ladders: [
            { from: 3, to: 23 },
            { from: 6, to: 17 },
            { from: 13, to: 35 },
            { from: 24, to: 47 },
            { from: 37, to: 58 },
            { from: 44, to: 66 },
            { from: 52, to: 71 },
            { from: 65, to: 84 },
            { from: 76, to: 96 },
            { from: 82, to: 100 }
        ],
        snakes: [
            { from: 20, to: 2 },
            { from: 32, to: 11 },
            { from: 41, to: 19 },
            { from: 50, to: 33 },
            { from: 59, to: 38 },
            { from: 67, to: 46 },
            { from: 83, to: 55 },
            { from: 90, to: 48 },
            { from: 97, to: 78 }
        ]
    }
];

module.exports = MAPS;
