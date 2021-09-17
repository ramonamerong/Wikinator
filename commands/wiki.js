//Import modules
const wiki = require('../personal_modules/wiki.module.js');
const embed = require('../personal_modules/embed.module.js');
const helper = require('../personal_modules/helper.module.js');
const db = require('../personal_modules/database.module.js');

//Import config
const wikiConfig = require('../config.json').commands.wiki;
const {prefix} = require('../config.json');

module.exports = {
    name: 'wiki',
    cooldown: '5',
    shortDesc: 'Search a wiki that is available on this server.',
    description:
        'This command can be used to search any registered wiki for info.' +
        '\nUse a **wiki abbreviation** if you want to search for a specific wiki. You can see all wikis with `'+prefix+'list`. The default is the English Wikipedia.' +
        '\nUse the **\'page\'** subcommand followed by a search term to search for a page title on the wiki;' +
        '\nthe **\'category\'** subcommand to get a category page with category members (if you enter \'all\' or nothing you will get all categories);' +
        '\nor the **\'search\'** subcommand to perform a exact text search on the wiki and get a list of pages.' +
        '\nIf you omit the subcommand entirely I will first search for a category, then for a page and at last for pages containing your search.' +
        '\nExample: `-wiki mc search creeper` - Search a minecraft wiki for all pages containing the word \'creeper\'.',
    category: 'Wiki - Browsing',
    usage: '[Wiki Abbreviation - Optional] [Subcommand - Optional] [Search]',
    extraFunc: async (message) => {

        //Retrieve all of the wikis for this server
        let res;
        try{
            res = await db.query('select * from wiki where guild_id = $1',
                [message.guild.id]);
        }
        catch{
            res = {rows: []};
        }
        return '**Possible wiki abbreviations are:** ' + res.rows.map(r => '`' + r.abbreviation + '`').join(', ') +
            '\n\n**Possible subcommands are:**\n\'page\' (search for a page)\n\'category\' (search for pages under a category)\n\'search\' (perform a text search in pages)'
    },
    argsOpt: false,
    guildOnly: false,
    dmOnly: false,
    delGuildMsg: false,
    async execute(message, args) {

        //When the first argument isn't 'page', 'category' or 'search',
        //retrieve all available wikis for this guild and find the one that correspondents to the first argument
        //When no is available, or en error occurs, use the default wiki
        let wikiInfo;
        if(!['page', 'category', 'search'].includes(args[0])){
            try{

                //Retrieve all wikis
                let res = await db.query('select * from wiki where guild_id = $1',
                    [message.guild.id]);

                //See if the first argument correspondents to one of the wikis' abbreviations
                wikiInfo = res.rows.find(w => w.abbreviation.toLowerCase() === args[0].toLowerCase());
                if(wikiInfo == null){
                    wikiInfo = helper.copy(wikiConfig);
                    wikiInfo.api_path = wikiConfig.apiPaths[0]
                } else {
                    args.shift();
                }

            } catch(e) {
                console.error(e);
                wikiInfo = helper.copy(wikiConfig);
                wikiInfo.api_path = wikiConfig.apiPaths[0]
            }
        } else{
            wikiInfo = helper.copy(wikiConfig);
            wikiInfo.api_path = wikiConfig.apiPaths[0]
        }

        //Generate reply when no argument is left over and return.
        if(args.length === 0){
            return message.reply('Specify what you want so search for.');
        }


        //Depending on the subcommand either a list of suggestions to a specific page or the page itself is returned ('page');
        //a list of pages belonging to a certain category and/or category members of a certain category ('category');
        //or a list of pages containing the searched word ('search').
        //When no subcommand is given but only a search term, the wiki is first searched by category, then page and then a text search.
        //The switch cases each return discord embed(s) which are then send to the discord channel.
        //A a Reaction Collector is also started to react to any input of the user to the embed (f.e. next/previous embed/page etc.).

        //Initiate embeds array
        let embeds;

        //Connect arguments with Into a single array. Also only add the connected arguments to the array, if it's not an empty space.
        const searchArgs = args.splice(1).join(' ');
        if(searchArgs.length){
            args.push(searchArgs);
        }

        switch (args[0].toLowerCase()) {

            //Get specific page info in the form of an embed from the wiki using the wiki api
            case 'page':

                //Generate reply when no argument is given and break out of the switch.
                if(args.length === 1){
                    return message.reply('Specify the page you want to search for.');
                }

                //Retrieve title suggestions
                let titles = await wiki.getTitles(args[1], wikiInfo);

                //If there are no results available save a default message into the array
                if (titles == null) {
                    embeds = [{embed: embed.createEmbed(
                        'Wiki page: ' + args[1],
                        'That page doesn\'t exist yet, do you wish to [create it](' + helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + args[1] + '?action=edit') + ')?',
                            helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + args[1]),
                            wikiInfo.logo,
                            wikiConfig.embed.color),
                    }];
                }

                //If there is only one result create only the embed(s) for that page
                else if(titles.length === 1){
                    embeds = await wiki.getPageEmbed(message, titles[0].title, null, wikiInfo)
                }

                //Otherwise create embed(s) which display all search results
                else{
                    embeds = embed.createListEmbed(
                        wikiConfig.embed,
                        'Returned pages for: ' + args[1],
                        'The following pages match your search results. Press one of the emojis (1⃣-🔟) to load more info of that page.',
                        helper.encDiscordURL(wikiInfo.url + wikiConfig.searchPath + args[1] + '&title=Special%3ASearch&go=Go'),
                        wikiInfo.logo,
                        'Results',
                        null,
                        titles);
                }

                break;


            //Get a list of categories or category members incorporated in a embed using the wiki api.
            case 'category':

                //Initiate embed title and description for when there is more than one returned category.
                let embedTitle;
                let embedDescription;

                //If no arguments are specified or the argument 'all', make the args[1] element een empty string.
                //Also change title and description for multiple category results accordingly.
                if(!args[1] || args[1] === 'all'){
                    args[1] = '';
                    embedTitle = 'All categories';
                    embedDescription = '';
                } else{
                    embedTitle = 'Returned categories for: ' + args[1];
                    embedDescription = 'The following categories match your search results.';
                }

                //Retrieve category suggestions
                let categories = await wiki.getCategories(args[1], wikiInfo);

                //If there are no results available save a default message into the array
                if (categories == null) {
                    embeds = [{embed: embed.createEmbed(
                            'Category: ' + args[1],
                            'That category doesn\'t exist yet, do you wish to [create it](' + helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + 'Category:' + args[1] + '?action=edit') + ')?',
                            helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + 'Category:' + args[1]),
                            wikiInfo.logo,
                            wikiConfig.embed.color),
                    }];
                }

                //If there is only one category create only the embed(s) for that category
                else if(categories.length === 1){
                    embeds = await wiki.getCategoryEmbed(message, categories[0].title, null, wikiInfo)
                }

                //Otherwise create embed(s) which display all category results
                else{
                    embeds = embed.createListEmbed(
                        wikiConfig.embed,
                        embedTitle,
                         embedDescription + 'Press one of the emojis (1⃣-🔟) to load the pages belonging to that category.',
                        helper.encDiscordURL(wikiInfo.url + wikiConfig.searchPath + 'Category:' + args[1] + '&title=Special%3ASearch&go=Go'),
                        wikiInfo.logo,
                        'Results',
                        null,
                        categories);
                }

                break;



            //Perform a text search on the wiki and return any results in the form of an embed
            case 'search':

                //Generate reply when no argument is given and break out of the switch.
                if(args.length === 1){
                    return message.reply('Specify a search term.');
                }

                //Retrieve search embed array
                embeds = await wiki.getSearchEmbed(message, args[1], null, wikiInfo);
                break;



            //When only a search term is specified, first search for the category on the wiki. In case of no results, look for a page.
            //If that doesn't return anything perform a text search. In all cases, return the appropriate embed.
            default:

                //Connect all arguments with into a single string. This is the search term.
                let arg = args.join(' ');

                //Retrieve category suggestions
                let categories2 = await wiki.getCategories(arg, wikiInfo);

                //If there results available get the category embeds.
                //Else look for page suggestions.
                if (categories2 != null) {

                    //If there is only one category create only the embed(s) for that category
                    if(categories2.length === 1){
                        embeds = await wiki.getCategoryEmbed(message, categories2[0].title, null, wikiInfo)
                    }

                    //Otherwise create embed(s) which display all category results
                    else{
                        embeds = embed.createListEmbed(
                            wikiConfig.embed,
                            'Returned categories for: ' + arg,
                            'The following categories match your search results. Press one of the emojis (1⃣-🔟) to load the pages belonging to that category.',
                            helper.encDiscordURL(wikiInfo.url + wikiConfig.searchPath + 'Category:' + arg + '&title=Special%3ASearch&go=Go'),
                            wikiInfo.logo,
                            'Results',
                            null,
                            categories2);
                    }

                } else{

                    let titles = await wiki.getTitles(arg, wikiInfo);

                    //Make category embeds when there are results.
                    //Else get a search embed.
                    if (titles != null) {

                        //If there is only one result create only the embed(s) for that page
                        if(titles.length === 1){
                            embeds = await wiki.getPageEmbed(message, titles[0].title, null, wikiInfo)
                        }

                        //Otherwise create embed(s) which display all search results
                        else{
                            embeds = embed.createListEmbed(
                                wikiConfig.embed,
                                'Returned pages for: ' + args,
                                'The following pages match your search results. Press one of the emojis (1⃣-🔟) to load more info of that page.',
                                helper.encDiscordURL(wikiInfo.url + wikiConfig.searchPath + arg + '&title=Special%3ASearch&go=Go'),
                                wikiInfo.logo,
                                'Results',
                                null,
                                titles);
                        }

                    } else{
                        embeds = await wiki.getSearchEmbed(message, arg, null, wikiInfo);
                    }
                }
        }

        //Send the embed in a message
        return embed.sendEmbed(wikiConfig.embed, message, embeds,
            [[wiki.getCategoryEmbed, /^Category:/i, wikiInfo], [wiki.getPageEmbed, /.+/, wikiInfo]]);
    }
};
