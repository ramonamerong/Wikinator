//Import modules
const wiki = require('../personal_modules/wiki.module.js');
const embed = require('../personal_modules/embed.module.js');
const helper = require('../personal_modules/helper.module.js');
const db = require('../personal_modules/database.module.js');

//Import config
const wikiConfig = require('../config.json').commands.wiki;

module.exports = {
    
    //The command for discord
    data: {
        type: 'CHAT_INPUT',
        defaultPermission: true,
        name: 'wiki',
        description: 'Search a wiki that is available on this server.',
        options: [
            {
                type: 'SUB_COMMAND',
                name: 'page',
                description: "Return wiki pages with titles matching your search.",
                options: [
                    {
                        type: 'STRING',
                        name: 'search',
                        description: 'What to search for in page titles.',
                        required: true
                    },
                    {
                        type: 'STRING',
                        name: 'wiki',
                        description: 'The abbreviation of the wiki to be searched. When omitted, the default wiki is searched.',
                        required: false,
                        autocomplete: true
                    },
                ]
            },
            {
                type: 'SUB_COMMAND',
                name: 'category',
                description: "Return wiki categories matching your search.",
                options: [
                    {
                        type: 'STRING',
                        name: 'search',
                        description: 'What to search for in categories.',
                        required: true
                    },
                    {
                        type: 'STRING',
                        name: 'wiki',
                        description: 'The abbreviation of the wiki to be searched. When omitted, the default wiki is searched.',
                        required: false,
                        autocomplete: false
                    },
                ]
            },
            {
                type: 'SUB_COMMAND',
                name: 'search',
                description: "Return wiki pages containing your searched phrase.",
                options: [
                    {
                        type: 'STRING',
                        name: 'search',
                        description: 'What to search for on pages.',
                        required: true
                    },
                    {
                        type: 'STRING',
                        name: 'wiki',
                        description: 'The abbreviation of the wiki to be searched. When omitted, the default wiki is searched.',
                        required: false,
                        autocomplete: true
                    },
                ]
            },
            {
                type: 'SUB_COMMAND',
                name: 'all',
                description: "Run all subcommands to search pages by their title/body and to search for categories.",
                options: [
                    {
                        type: 'STRING',
                        name: 'search',
                        description: 'What to search for in page titles, categories and bodies.',
                        required: true
                    },
                    {
                        type: 'STRING',
                        name: 'wiki',
                        description: 'The abbreviation of the wiki to be searched. When omitted, the default wiki is searched.',
                        required: false,
                        autocomplete: true
                    }
                ]
            },
        ]
    },

    //Additional info for permissions and help command
    category: 'Wiki',
    longDescription:
        'This command can be used to search any registered wiki for info.' +
        '\nUse a **wiki abbreviation** if you want to search for a specific wiki. You can see all wikis with `/list`. The default is either the default wiki for the server or the English Wikipedia.' +
        '\nUse the **\'page\'** subcommand to search for wiki pages with the searched title;' +
        '\nthe **\'category\'** subcommand to search for matching categories and pages falling under these categories (if you enter \'all\' you will get all categories);' +
        '\nor the **\'search\'** subcommand to search for wiki pages containing your search in their body.' +
        '\nIf you use the **\'all\'**  subcommand page titles, categories and bodies will all be searched.' +
        '\nExample: `/wiki search mc  creeper` - Search a minecraft wiki for all pages containing the word \'creeper\'.',
    usage: 'page/category/search/all [search] [wiki abbreviation - optional]',
    
    //Additional info for permissions and help command
    dynamicUsage: async (interaction) => {
        
        //Retrieve all of the wikis for this server
        let res;
        try{
            res = await db.query('select * from wiki where guild_id = $1',
                [interaction.guild.id]);
        }
        catch{
            res = {rows: []};
        }
        return '**Possible wiki abbreviations are:** ' + res.rows.map(r => '`' + r.abbreviation + '`').join(', ') +
            '\n\n**Possible subcommands are:**\n\'page\' (search for a page)\n\'category\' (search for pages under a category)\n\'search\' (perform a text search in pages)'
    },
    guildOnly: true,
    dmOnly: false,

    //Command code
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const abbreviation = interaction.options.getString('wiki');
        const search = interaction.options.getString('search');

        //Defer reply
        await interaction.deferReply();

        //When an abbreviation for a wiki is given, find the wiki of this guild with that abbreviation
        //When no is available, or an error occurs, report this back to the user
        let wikiInfo;
        if(abbreviation != null){

            let res = await db.query('select * from wiki where guild_id = $1 and LOWER(abbreviation) = LOWER($2)',
                [interaction.guild.id, abbreviation]);
            wikiInfo = res.rows[0];

            if(!wikiInfo) return await interaction.reply({content: 'There is no wiki with that abbreviation for this server!', empephemeral: true});
        
        //When no abbreviation is given, try to retrieve the default wiki or else use the English wikipedia
        } else{

            let res = await db.query('select * from wiki where guild_id = $1 and "default" = $2',
            [interaction.guild.id, true]);
            wikiInfo = res.rows[0]

            if(!wikiInfo){
                wikiInfo = helper.copy(wikiConfig);
                wikiInfo.api_path = wikiConfig.apiPaths[0];
            }
        }


        //Depending on the subcommand either a list of suggestions to a specific page or the page itself is returned ('page');
        //a list of pages belonging to a certain category and/or category members of a certain category ('category');
        //or a list of pages containing the searched word ('search').
        //When the subcommand 'all', all will be searched.
        //The if statements each return discord embed(s) which are then send to the discord channel.
        //A message component collector is also started to react to any input of the user to the embed (f.e. next/previous embed/page etc.).

        //Initiate object to save embeds and the number of results
        let subEmbeds = {};
        let resultsNum = {};

        //Get specific page info in the form of an embed from the wiki using the wiki api
        let returnObject;
        if(['page', 'all'].includes(subcommand)){
            returnObject = await wiki.getPageListEmbed(search, wikiInfo);
            subEmbeds['page'] = returnObject.embeds;
            resultsNum['page'] = returnObject.numResults;
        }

        //Get a list of categories or category members incorporated in a embed using the wiki api.
        if(['category', 'all'].includes(subcommand)){
            returnObject = await wiki.getCategoryListEmbed(search, wikiInfo, subcommand != 'all');
            subEmbeds['category'] = returnObject.embeds;
            resultsNum['category'] = returnObject.numResults;
        }

        //Perform a text search on the wiki and return any results in the form of an embed
        if(['search', 'all'].includes(subcommand)){
            returnObject = await wiki.getSearchListEmbed(search, wikiInfo);
            subEmbeds['search'] = returnObject.embeds;
            resultsNum['search'] = returnObject.numResults;
        }

        //If the subcommand is not 'all' return the embeds of the specific subcommand
        let embeds;
        if(subcommand != 'all'){
            embeds = subEmbeds[subcommand];
        
        //Otherwise create a list embed displaying the number of results for each subcommand
        } else {
            listItems = []
            titlePart = {
                page: 'page search by title',
                category: 'category search',
                search: 'page search by body'
            }
            for(const [key, value] of Object.entries(subEmbeds)){
                listItems.push({
                    title: (resultsNum[key] != null? resultsNum[key] + ' results for ' : 'Results for ' ) + titlePart[key] + ' using `/wiki ' + key + '`',
                    url: value[0].embed.url,
                    subEmbeds: value
                });
            }
            embeds = embed.createListEmbed(
                wikiConfig.embed,
                'Returned pages/categories for: ' + search,
                'Press one of the emoji buttons (1⃣-🔟) to load the results belonging to that subcommand.',
                helper.encDiscordURL(wikiInfo.url + '/wiki/Special:Search?query=' + search + '&scope=internal&navigationSearch=true'),
                wikiInfo.logo,
                'Results',
                null,
                listItems
            );
        }

        //Send the embed in a message
        const menuEmbed = new embed.MenuEmbed(wikiConfig.embed, interaction, embeds);
        menuEmbed.start()
    },


    //Function for autocompletions
    async autocomplete(currentArgument, currentValue, interaction){

        //Retrieve all wikis registrered for this server
        const res = await db.query('select name, abbreviation, url from wiki where guild_id = $1', [interaction.guild.id]);

        //Create and return suggestions  
        return res.rows
            .map(row => row.abbreviation)
            .filter(abr => abr.toLowerCase().startsWith(currentValue.toLowerCase()))
            .sort();
    }
};
