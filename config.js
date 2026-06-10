module.exports = {
    // --- Trusted users (bypass ALL automod)
    trustedUserIds: [
        '421712596673101825',
    ],

    // --- Trusted roles (bypass ALL automod)
    trustedRoleIds: [
        // add mod role IDs here when you have mods
    ],

    autoMod: {

        // --- Spam 
        spam: {
            enabled: true,
            threshold: 5,
            window: 5000,
        },

        // --- Discord invites
        invites: {
            enabled: true,
        },

        // --- Links
        links: {
            enabled: true,
            allowedDomains: [
                'youtube.com',
                'twitter.com',
                'twitch.tv',
                'x.com',
                'github.com',
                'imgur.com',
            ],
        },

        // --- Phishing
        phishing: {
            enabled: true,
        },

        // --- Banned words,
        bannedWords: {
            enabled: true,
            words: [
                // add your words here
                // example: 'badword1',
            ],
        },

        // --- Caps filter
        caps: {
            enabled: true,
            percentage: 70,
            minLength: 10,
        },

        // --- Emoji spam
        emoji: {
            enabled: true,
            max: 10,
        },

        // --- Mention spam
        mentions: {
            enabled: true,
            max: 5,
        },

        // --- Duplicate messages
        duplicates: {
            enabled: true,
            threshold: 3,
            window: 10000,
        },

        // --- Zalgo text
        zalgo: {
            enabled: true,
        },

        // --- Character repetition
        characterRepeat: {
            enabled: true,
            max: 10,
        },

        // --- Personal info
        personalInfo: {
            enabled: true,
        },

        // --- Mass mention (@everyone/@here)
        massMention: {
            enabled: true,
        },
    },
};

