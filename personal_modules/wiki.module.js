//Import modules
const Discord = require('discord.js');
const axios = require('axios');
const helper = require('../personal_modules/helper.module.js');
const embed = require('../personal_modules/embed.module.js');

//Import config
const wikiConfig = require('../config.json').commands.wiki;
const {prefix} = require('../config.json');

module.exports = {
    name: 'wiki',

    //Function to execute the wiki command from within a list embed
    async subExecute(message, title, commandMsg){
        let splitTitle = helper.separateEndBrackets(title);
        commandMsg.content = '-wiki ' + (splitTitle[1].includes('Wiki - Category')? 'category ' : '') + splitTitle[0];
        message.client.emit('message', commandMsg)
    },

    //Function to retrieve page information from the wiki and insert it into embed(s) which are returned.
    async getPageEmbed(message, title, commandMsg, wikiInfo) {
        
        //Import embed module
        const embed = require('../personal_modules/embed.module.js');

        try {
            
            //Check the existence of the page and return title and url info if applicable
            let response = await axios.get(wikiInfo.url + wikiInfo.api_path, {
                params: {
                    action: 'query',
                    format: 'json',
                    formatversion: '2',
                    prop: 'info|images',
                    inprop: 'url|displaytitle',
                    titles: title,
                    redirects: wikiConfig.pageRedirects
                }
            });

            if(response.data.error){
                console.error(Object.values(response.data.error).join('\n'));
                return embed.createErrorEmbed();
            }
            
            //Retrieve the page
            const page = helper.getValues(response.data.query.pages, false)[0];

            
            //If the page is missing or invalid, return a default embed message
            if (page.missing === true || page.missing === '') {
                return[{
                    embed: embed.createEmbed(
                        'Wiki page: ' + title,
                        'That page doesn\'t exist yet, do you wish to [create it](' + helper.encDiscordURL(page.editurl) + ')?',
                        helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + title),
                        wikiInfo.logo,
                        wikiConfig.embed.color)
                }];
            } else if (page.invalid === true || page.invalid === '') {
                return [{
                    embed: embed.createEmbed(
                        'Wiki page: ' + title,
                        'The page name contains invalid characters. Don\'t try to break me, you won\'t succeed.',
                        helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + title),
                        wikiInfo.logo,
                        wikiConfig.embed.color)
                }];
            }


            //Retrieve one image from the page to use as a thumbnail.
            //This is done by looking for an image that contains the page title in its file name.
            //If no image can be found, the default wiki logo is used.
            let image;
            let thumbnailName;
            let thumbnail;

            if (page.images === undefined) {
                thumbnail = wikiInfo.logo;
            } else {
                image = page.images.find(image => image.title.toLowerCase().includes(page.displaytitle.toLowerCase()));

                if (image === undefined) {
                    thumbnail = wikiInfo.logo;
                } else {
                    thumbnailName = image.title;

                    response = await axios.get(wikiInfo.url + wikiInfo.api_path, {
                        params: {
                            action: 'query',
                            format: 'json',
                            formatversion: '2',
                            prop: 'imageinfo',
                            iiprop: 'url',
                            titles: thumbnailName
                        }
                    });

                    if(response.data.error){
                        console.error(Object.values(response.data.error).join('\n'));
                        return embed.createErrorEmbed();
                    }

                    thumbnail = helper.getValues(response.data.query.pages, false)[0].imageinfo[0].url;
                }
            }


            //Retrieve sections of the page.
            response = await axios.get(wikiInfo.url + wikiInfo.api_path, {
                params: {
                    action: 'parse',
                    format: 'json',
                    formatversion: '2',
                    prop: 'sections',
                    page: page.title
                }
            });

            if(response.data.error){
                console.error(Object.values(response.data.error).join('\n'));
                return embed.createErrorEmbed();
            }

            //Convert sections, if any, into 'createListEmbed' compatible array.
            let listItems = [];
            if (response.data.parse.sections !== undefined) {
                const sections = response.data.parse.sections;
                if (sections.length > 0) {
                    for (let i = 0; i < sections.length; i++) {
                        listItems.push({
                            title: sections[i].number + ' ' + sections[i].line,
                            url: helper.encDiscordURL(page.fullurl) + "#" + sections[i].anchor
                        })
                    }
                } else{
                    listItems = null;
                }
            } else{
                listItems = null;
            }


            //Setting up embed(s) and returning it.
            return embed.createListEmbed(
                wikiConfig.embed,
                "Wiki page: " + page.displaytitle,
                "[[Visit]](" + helper.encDiscordURL(page.fullurl) + ") [[Edit]](" + helper.encDiscordURL(page.editurl) + ")",
                page.fullurl,
                thumbnail,
                'Contents',
                null,
                listItems,
                false,
                true
            );

        } catch (error) {
            console.error(error);
            return embed.createErrorEmbed();
        }
    },


    async getCategoryEmbed(message, title, commandMsg, wikiInfo) {

        //Remove favorite markup
        if(title.includes('(Wiki -')){
            title = helper.separateEndBrackets(title)[0];
        }

        //Import embed module
        const embed = require('../personal_modules/embed.module.js');

        try {

            //Get category members of category
            let response = await axios.get(wikiInfo.url + wikiInfo.api_path, {
                params: {
                    action: 'query',
                    list: 'categorymembers',
                    format: 'json',
                    formatversion: '2',
                    titles: title,
                    cmtitle: title,
                    cmlimit: wikiConfig.embed.maxResults
                }
            });

            if(response.data.error){
                console.error(Object.values(response.data.error).join('\n'));
                return embed.createErrorEmbed();
            }
            
            const categoryMembers = response.data.query.categorymembers;
            let categoryMembersEmbed;
            const categoryPage = helper.getValues(response.data.query.pages, false)[0];
            let categoryPageEmbed;
            

            //If both the category page and category members are missing return a default message embed.
            if(categoryPage.missing && !categoryMembers){
                return [{embed: embed.createEmbed(
                            'Category page: ' + categoryPage.title,
                            'This category doesn\'t exist yet, do you wish to [create it](' + helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + categoryPage.title) + '?',
                            helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + 'Category:' + search),
                            wikiInfo.logo,
                            wikiConfig.embed.color)
                }];
            }

            //If the page is missing save a default page embed
            else if (categoryPage.missing) {
                const categoryPageEmbed = [{embed: embed.createEmbed(
                        'Category page: ' + categoryPage.title,
                        'This category doesn\'t have a page yet, would you like to create it [create it](' + helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + categoryPage.title) + '?',
                        helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + categoryPage.title),
                        wikiInfo.logo,
                        wikiConfig.embed.color)
                }];
            }

            //If the category members are missing save a default category members embed
            else if (!categoryMembers) {
                const categoryMembersEmbed = [{embed: embed.createEmbed(
                        'Members of: ' + categoryPage.title,
                        'This category doesn\'t have any category members.',
                        helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + categoryPage.title),
                        wikiInfo.logo,
                        wikiConfig.embed.color)
                }];
            }


            //Create a category page embed when it's not already created
            const wikiModule = require('../personal_modules/wiki.module.js');
            
            if(!categoryPageEmbed){
                categoryPageEmbed = await wikiModule.getPageEmbed(message,categoryPage.title, null, wikiInfo)
            }

            //Set the description for the category page embed
            categoryPageEmbed
                .forEach(embed => embed.embed.description += '\nPress \'➡\' to see the pages that belong in this category.');

            //Retrieve the thumbnail from the categoryPageEmbed.
            const categoryThumbnail = categoryPageEmbed[0].embed.thumbnail.url;

            //Create a category members embed when category members are available for this category
            if(!categoryMembersEmbed){

                //First convert the category members array into an acceptable array/list for the createListEmbed function
                let categoryMemberList = [];
                for (let i = 0; i < categoryMembers.length; i++) {
                    categoryMemberList.push({
                        title: categoryMembers[i].title,
                        url: helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + categoryMembers[i].title)
                    })
                }

                //Then create the embed with that list
                categoryMembersEmbed = embed.createListEmbed(
                    wikiConfig.embed,
                    'Members of: ' + categoryPage.title,
                    'This category has the following members. Press one of the emojis (1⃣-🔟) to load more info of that member.',
                    helper.encDiscordURL(wikiInfo.url + wikiConfig.searchPath + categoryPage.title + '&title=Special%3ASearch&go=Go'),
                    categoryThumbnail,
                    'Members',
                    null,
                    categoryMemberList);
            }


            //Returning embeds.
            return categoryPageEmbed.concat(categoryMembersEmbed);

        } catch (error) {
            console.error(error);
            return embed.createErrorEmbed();
        }
    },


    //Function to retrieve search matched information from the wiki and insert it into embed(s) which are returned.
    async getSearchEmbed(message, search, commandMsg, wikiInfo) {

        //Import embed module
        const embed = require('../personal_modules/embed.module.js');

        try{

            //Check if there are any results of the page and return title and url info if applicable
            let response = await axios.get(wikiInfo.url + wikiInfo.api_path, {
                params: {
                    action: 'query',
                    list: 'search',
                    format: 'json',
                    formatversion: '2',
                    srsearch: search,
                    srlimit: wikiConfig.embed.maxResults,
                    srwhat: 'text'
                }
            });

            if(response.data.error){
                let msg;
                if(response.data.error.code === 'srsearch-text-disabled')
                    msg = 'The text search functionality is disabled for this wiki.';
                else console.error(Object.values(response.data.error).join('\n'));

                return embed.createErrorEmbed(msg);
            }

            const searchResults = response.data.query.search;

            //If the search has no results, return a default message embed
            if(!searchResults.length){
                return [{embed: embed.createEmbed(
                        'Search results for: ' + search,
                        'Your search didn\'t return any results. Try again.',
                        helper.encDiscordURL(wikiInfo.url + wikiConfig.searchPath + search + '&title=Special%3ASearch&go=Go'),
                        wikiInfo.logo,
                        wikiConfig.embed.color)
                }];
            }

            //Convert search results into 'createListEmbed' compatible array.
            let listItems = [];
            for (let i = 0; i < searchResults.length; i++) {
                listItems.push({
                    title: searchResults[i].title,
                    url: helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + searchResults[i].title),
                    description: searchResults[i].snippet
                })
            }

            //Setting up embed(s) and returning it.
            return embed.createListEmbed(
                wikiConfig.embed,
                "Search results for: " + search,
                "The following results matched your search. Press one of the emojis (1⃣-🔟) to load the page containing your search.",
                helper.encDiscordURL(wikiInfo.url + wikiConfig.searchPath + search + '&title=Special%3ASearch&go=Go'),
                wikiInfo.logo,
                'Results',
                null,
                listItems,
                true);
        }

        catch (error) {
            console.error(error);
            return embed.createErrorEmbed();
        }
    },


    //Function to get a list of page titles and urls in a format acceptable by the createListEmbed function
    async getTitles(title, wikiInfo) {

        //Import embed module
        const embed = require('../personal_modules/embed.module.js');

        try{

            //Return a list of possible titles and urls
            let response = await axios.get(wikiInfo.url + wikiInfo.api_path, {
                params: {
                    action: 'opensearch',
                    format: 'json',
                    formatversion: '2',
                    search: title,
                    limit: wikiConfig.embed.maxResults,
                    namespace: wikiConfig.titleSearchNamespaces,
                    redirects: wikiConfig.titleRedirects,
                    suggest: true,
                    profile: wikiConfig.titleSearchProfile
                }
            });

            if(response.data.error){
                console.error(Object.values(response.data.error).join('\n'));
                return embed.createErrorEmbed();
            }

            let titles = [];
            if(response.data[1].length){
                for(let i = 0; i < response.data[1].length; i ++){
                    titles.push({
                        title: response.data[1][i],
                        url: (response.data[3] && response.data[3].length)? response.data[3][i] : wikiInfo.url + wikiConfig.pagePath + response.data[1][i]
                    })
                }
            } else{
                titles = null;
            }

            return titles;

        } catch(error){
            console.error(error);
            return embed.createErrorEmbed();
        }
    },


    //Function to get a list of category titles and urls in a format acceptable by the createListEmbed function
    async getCategories(search, wikiInfo) {

        //Import embed module
        const embed = require('../personal_modules/embed.module.js');

        try{
            
            //Return a list of possible titles and urls
            let response = await axios.get(wikiInfo.url + wikiInfo.api_path, {
                params: {
                    action: 'query',
                    list: 'allcategories',
                    acprefix: search,
                    aclimit: wikiConfig.embed.maxResults,
                    format: 'json',
                    formatversion: '2',
                }
            });

            if(response.data.error){
                console.error(Object.values(response.data.error).join('\n'));
                return embed.createErrorEmbed();
            }

            //Convert the different category formats to the same format
            response.data.query.allcategories = helper.getValues(response.data.query.allcategories);


            let categories = [];
            if(response.data.query.allcategories.length){

                for(let i = 0; i < response.data.query.allcategories.length; i++){
                    categories.push({
                        title: 'Category:' + response.data.query.allcategories[i],
                        url: helper.encDiscordURL(wikiInfo.url + wikiConfig.pagePath + 'Category:' + response.data.query.allcategories[i])
                    })
                }
            } else{
                categories = null;
            }

            return categories;

        } catch(error){
            console.error(error);
            return embed.createErrorEmbed();
        }
    }
};
