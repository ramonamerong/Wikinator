# Discord wiki bot: Wikinator

<h3>Description</h3>
<p>
  This bot is intended for browsing multiple wikis from within a server.
  You can almost add all kind of wikis, ranging from a normal Wikipedia to a Gamepedia or Fandom wiki.
  You can then browse that wiki from within Discord using a set abbrevation.
</p>

<h3>Adding the bot to your server</h3>
<p>
  An hosted version of the bot can be found at [top.gg](https://top.gg/bot/708782396023242753). Alternatively, you can host the bot yourself if you know how to do so, but be aware that this bot was created during version 11 of [DiscordJS](https://discord.js.org/). For the setup the following things are required:
  <ul>
    <li>A PostgreSQL database must first be setup according to the schema in <code>database.psql</code>. An example would be to first create a database with <code>CREATE DATABASE db_name;</code> and then load the schema with <code>psql -U db_user db_name < database.psql;</code>.</li>
    <li>A discord bot must be created at https://discord.com/developers/applications and the token must be added to <code>config.json > token</code>.</li>
    <li>The database host location (<code>localhost</code> by default), PostgreSQL username and password must be added to <code>config.json > database</code></li>
  </ul>
  After starting the bot with node, the database is connected succesfully when the message <code>Database connected</code> is displayed in the console.
</p>

<h3>Slash commands</h3>
<ul>
  <li>
    <code>/help [command name]</code>This command can be used to get a list of all commands or more info about a certain command.
  </li>
  <li>
    <code>/add [wiki abbreviation] [wiki url] [default]</code>
      (This command is limited to the owner and admins of a server) Use this command to add (or update when using the same abbreviation) a wiki to this server. The provided wiki abbreviation can be used in conjunction with the <code>/wiki</code> command to search that wiki. The wiki url must be of the format <code>https://example.com</code>. You can also set the wiki as the default for the server so the abbreviation is not needed when using `/wiki`.
  </li>
  <li>
    <code>/remove [wiki abbreviation, name or url]</code>
      (This command is limited to the owner and admins of a server) With this command you can remove a wiki from your server. You can do this by providing either the wiki's abbreviation, name or url (in the format <code>https://example.com</code>).
  </li>
  <li>
    <code>/wiki page/category/search/all [search] [wiki abbreviation - optional]</code>
        This command can be used to search any registered wiki for info.
        <br>Use a wiki abbreviation if you want to search for a specific wiki. You can see all wikis with '/list'. The default is the English Wikipedia.
        <br>Use the <code>page</code> subcommand to search for wiki pages with the searched title;
        <br>the <code>category</code> subcommand to search for matching categories and pages falling under these categories (if you enter \'all\' you will get all categories);
        <br>or the <code>search</code> subcommand to search for wiki pages containing your search in their body.
        <br>If you use the <code>all</code> subcommand page titles, categories and bodies will all be searched.
        <br>Example: <code>/wiki mc search creeper</code> - Search a minecraft wiki for all pages containing the word 'creeper'.
  </li>
  <li>
    <code>/list</code>
      Use this command to get a list of all available wikis to this server. The wiki's name and abbreviation will both be displayed.
  </li>
  <li>
    <code>/calc [arithmetic sum]</code>
      Use this command to calculate a simple arithmetical sum, only containing addition '+', subtraction '-', multiplication '*', division '/' and power '^' operators. You can also enclose something in brackets '()' to indicate that that should be calculated first.
    <br>Example: <code>/calc (2+3) * 5</code>
  </li>
</ul>

<h3>Future additions</h3>
<ul>
  <li>Different embed colors for each added wiki.</li>
</ul>

<h3>Contact</h3>
<p>
  Please open an issue on this GitHub or contact me on ramonamerong@live.nl in case you have found any bugs or if you want to provide suggestions for future additions!
</p>
