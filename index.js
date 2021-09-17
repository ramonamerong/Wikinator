// Things to do
// - Retrieve and display wiki name (as author and in the list) and also delete with it
// - Fix descriptions
// - If an url is provided during -wiki, instead of an abbr use that instead

//Loading config into objects
const {prefix, token, username, avatar, status, ownerWelcomeMsg} = require('./config.json');
const commandConfig = require('./config.json').commands;

//Importing Discord and file system modules
const Discord = require('discord.js');
const fs = require('fs');
const helper = require('./personal_modules/helper.module');

//Making new discord client
const client = new Discord.Client();

//Creating a discord collection for commands
//and loading all command files into this collection by looping over the file names.
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

commandFiles.forEach(file => {
    const command = require('./commands/' + file);
    client.commands.set(command.name.toLowerCase(), command)
});


//Creating a discord collection for saving timestamps of recent executions per command.
const cooldowns = new Discord.Collection();

//Logging in and entering message into console when successful
client.login(token);

client.once('ready', () => {
    //Apply config to client
    // client.user.setUsername(username);
    // client.user.setAvatar(avatar);
    client.user.setStatus(status);
    client.user.setActivity(status);

    console.log('Logged into Discord');
});

//When joining the server as a bot, send a message to the owner with instructions on how to use the bot
client.on('guildMemberAdd', member => {
    if(member.user.id === client.user.id){
        member.guild.owner.send(ownerWelcomeMsg)
    }
});

//Event listener for replying to commands.
client.on('message', message => {

    //When a message doesn't start with the prefix OR the author is a bot, the event listener is canceled.
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    //Separate the command name from the msg and split the remaining message in arguments
    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    //Load the actual command by name or alias. When nothing can be loaded stop the event listener and give an error.
    const command = client.commands.get(commandName)
        || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if(!command) return;

    //Log which user has used which command
    console.log(message.author.username + ' used ' + "'" + commandName + "'");

    //Check whether the command can be only be executed in servers.
    //If so, a message will be sent when trying to execute this command outside of a server/guild.
    if(command.guildOnly && message.channel.type !== 'text'){
        return message.reply('I can only execute this command in servers.');
    }

    //Check whether the command can be only be executed in dms.
    //If so, a message will be sent when trying to execute this command inside of a server/guild.
    if(command.dmOnly && message.channel.type !== 'dm'){
        helper.directMsg('I can only execute this command in dm.', message.author, message.channel);
        if(command.delGuildMsg){
            message.delete().catch(() =>{
                message.channel.guild.owner.send('I tried to delete a message from the server, but I wasn\'t able to.\nPlease give me this permission.').catch(console.error);
            });
        }
        return
    }

    //Check whether the command requires arguments and if so return a message when there are no arguments.
    if(!command.argsOpt && !args.length){
        let reply = 'You need to specify arguments.';

        if(command.usage){
            reply += '\nThe proper usage should be: `' + prefix + commandName + ' ' + command.usage + '`';
        }

        return message.reply(reply)
    }

    //Check whether the command can only be carried out by the owner, if so, check whether the user is the owner
    //And return an message when the user is not.
    if(command.ownerOnly && message.author.id !== (message.guild? message.guild.owner.id : null)){
        return message.reply('This command can only be executed by the owner of the server.');
    }


    //Check whether the command can only be carried out by admins, if so, check whether the user is an admin
    //And return an message when the user is not.
    if(command.adminOnly && message.member && !message.member.hasPermission("ADMINISTRATOR")){
        return message.reply('This command can only be executed by admins of the server.');
    }


    //If the cooldown collection doesn't have a command entry, make one
    if(!cooldowns.has(command.name)){
        cooldowns.set(command.name, new Discord.Collection())
    }

    //Get the current time, the countdown duration of the command and timestamps of recent executions of the command per user.
    const now = Date.now();
    const cooldownAmount = (command.cooldown || 3) * 1000;
    const timestamps = cooldowns.get(command.name);

    //When the user recently executed the command, check whether the cooldown period has passed.
    //If so, return a message.
    //If not, save a new timestamp into the cooldown collection
    if(timestamps.has(message.author.id)){
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

        if(now < expirationTime){
            return message.reply('Please wait ' + Math.round((expirationTime - now)/1000) + ' more seconds before trying this command again.')
        }
    } else{
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount)
    }

    //Execute the command
    try {
        return command.execute(message, args)
    } catch (error) {
        console.error(error);
        return message.reply(commandConfig.errorMsg);
    }
});