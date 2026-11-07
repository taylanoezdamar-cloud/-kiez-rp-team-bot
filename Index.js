const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Diese IDs tragen wir später ein
const SOURCE_GUILD_ID = 'INFERNO_SERVER_ID';
const TARGET_GUILD_ID = 'KIEZ_SERVER_ID';
const SOURCE_CATEGORY_ID = 'TEAM_KATEGORIE_ID';

const commands = [
    new SlashCommandBuilder()
        .setName('teamchannel-kopieren')
        .setDescription('Kopiert die Team-Kategorie von Inferno Roleplay')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`Bot online: ${client.user.tag}`);

    const rest = new REST({ version: '10' })
        .setToken(process.env.DISCORD_TOKEN);

    await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
    );

    console.log('Slash-Befehl registriert!');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'teamchannel-kopieren') return;

    if (interaction.guildId !== TARGET_GUILD_ID) {
        return interaction.reply({
            content: 'Dieser Befehl ist nur auf KIEZ RP verfügbar.',
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const source = await client.guilds.fetch(SOURCE_GUILD_ID);
        const target = await client.guilds.fetch(TARGET_GUILD_ID);

        const category = await source.channels.fetch(
            SOURCE_CATEGORY_ID
        );

        if (!category || category.type !== ChannelType.GuildCategory) {
            throw new Error('Team-Kategorie nicht gefunden!');
        }

        const channels = await source.channels.fetch();

        const children = [...channels.values()]
            .filter(channel => channel.parentId === category.id)
            .sort((a, b) => a.position - b.position);

        const newCategory = await target.channels.create({
            name: category.name,
            type: ChannelType.GuildCategory
        });

        for (const channel of children) {
            if (![ChannelType.GuildText, ChannelType.GuildVoice].includes(channel.type)) {
                continue;
            }

            await target.channels.create({
                name: channel.name,
                type: channel.type,
                parent: newCategory.id,
                topic: channel.topic || undefined,
                nsfw: channel.nsfw || false,
                bitrate: channel.type === ChannelType.GuildVoice
                    ? channel.bitrate
                    : undefined,
                userLimit: channel.type === ChannelType.GuildVoice
                    ? channel.userLimit
                    : undefined
            });
        }

        await interaction.editReply(
            `✅ Kategorie **${category.name}** und ${children.length} erkannte Kanäle wurden übertragen.`
        );

    } catch (error) {
        console.error(error);
        await interaction.editReply(
            '❌ Fehler beim Kopieren. Bitte überprüfe die Server- und Kategorie-IDs.'
        );
    }
});

client.login(process.env.DISCORD_TOKEN);
