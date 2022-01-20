//When an unhandled Promise Rejection appears, catch it and log the error
process.on('unhandledRejection', error => console.error('Uncaught Promise Rejection', error));

//Loading config into objects
const {token, username, avatar, status, welcomeChannelId, welcomeEmojiId, ownerId, testGuildId, autosuggestNum} = require('./config.json');
const commandConfig = require('./config.json').commands;

//Importing Discord, file system and embed modules
const Discord = require('discord.js');
const fs = require('fs');
const embed = require('./personal_modules/embed.module.js');
const helper = require('./personal_modules/helper.module.js');

//Making new discord client
const {GUILDS} = Discord.Intents.FLAGS
const client = new Discord.Client({intents: [GUILDS]});

//Creating a discord collection for commands
//and loading all command files into this collection by looping over the file names.
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

commandFiles.forEach(file => {
    const command = require('./commands/' + file);
    client.commands.set(command.data.name.toLowerCase(), command)
});

//Logging in and entering message into console when successful
client.login(token);

let commandManager;
const test = process.argv[3] == 'test';
let testGuild;
if(test) console.log('Test run');
client.once('ready', async () => {
    client.user.setStatus(status);
    client.user.setActivity(status);

    console.log('Logged into Discord');

    //When refresh or delete is given as a first argument, all commands are first removed
    commandManager = client.application.commands
    if(process.argv[2] == 'refresh' || process.argv[2] == 'delete'){

        let commands
        if(test){
            testGuild = await client.guilds.fetch(testGuildId);
            if(testGuild.commands)
                commands = await testGuild.commands.fetch();
        } else commands = await commandManager.fetch();
        
        if(commands)
            commands.forEach(command => {
                commandManager.delete(command.id, test? testGuildId : null).then().catch(console.error)
            })

        console.log('Commands removed');
    }

    //Register commands when the first argument is add or refresh, 
    //but when test is given as the second argument, register commands only for test guild
    if(process.argv[2] == 'add' || process.argv[2] == 'refresh'){
        client.commands.forEach(command => {
            commandManager.create(command.data, test? testGuildId : null);
        })
        console.log('Commands added');
    }

    //Create a content property for storing images in the client object
    client.content = {};
});

//Event listener for replying to commands
client.on('interactionCreate', async interaction => {

    //Only continue if the interaction is a command
    if(!interaction.isCommand()) return;

    //Retrieve the command and only continue if it exists
    const command = client.commands.get(interaction.commandName)
    if (!command) return;

    //Check whether the command can be only be executed in dms.
    //If so, a message will be sent when trying to execute this command inside of a server/guild.
    if(command.dmOnly && interaction.guild != null){
        return interaction.reply({content: 'I can only execute this command in dm.', ephemeral: true});
    }

    //Check whether the command can be only be executed in servers.
    //If so, a message will be sent when trying to execute this command outside of a server/guild.
    if(command.guildOnly && interaction.guild == null){
        return interaction.reply({content: 'I can only execute this command in servers.', ephemeral: true});
    }

    //Check whether the command can only be carried out by the bot owner, if so, check whether the user is the bot owner
    //And return a message when the user is not.
    if(command.botOwnerOnly && interaction.user.id !== ownerId){
        return interaction.reply({content: 'This command can only be executed by the owner of the bot.', ephemeral: true});
    }

    //Check whether the command can only be carried out by the owner (unless in dms), if so, check whether the user is the owner
    //And return a message when the user is not.
    if(command.ownerOnly && interaction.guild && interaction.user.id !== interaction.guild.ownerId){
        return interaction.reply({content: 'This command can only be executed by the owner of the server.', ephemeral: true});
    }

    //Check whether the command can only be carried out by admins, if so, check whether the user is an admin
    //And return a message when the user is not.
    if(command.adminOnly && interaction.guild && !interaction.member.permissions.has("ADMINISTRATOR")){
        return interaction.reply({content: 'This command can only be executed by admins of the server.', ephemeral: true});
    }

    //Execute command
    try{
        await command.execute(interaction);
    } catch(error) {
        console.error(error);
        await interaction.reply(embed.createErrorEmbed());
    }
});

//Event listener for replying to commands
client.on('interactionCreate', async autoInteraction => {

    //Only continue if the interaction is an autocomplete interaction
    if(!autoInteraction.isAutocomplete()) return;

    //Determine which (sub/group)command and argument should be autocompleted
    const commandName = autoInteraction.commandName;
    const {name: currentArgument, value: currentValue} = autoInteraction.options._hoistedOptions.find(option => option.focused);

    //Carry out the autocomplete method of the command to get suggestions
    suggestions = await client.commands.get(commandName).autocomplete(currentArgument, currentValue, autoInteraction)

    //Respond with the suggestions
    autoInteraction.respond(helper.arrayObjectify(suggestions.slice(0, autosuggestNum)))
})
