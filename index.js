const Discord = require('discord.js');
const intents = ["GUILDS", "GUILD_MEMBERS", "GUILD_VOICE_STATES"];
const robot = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES", "GUILD_VOICE_STATES"], ws:{ intents: intents }});
const {MessageActionRow, MessageButton, MessageSelectMenu} = require("discord.js");
const fs = require('fs');
const comms = require("./comms.js");
let config = require('./config.json');
let guilds = require('./guilds.json');        
const names = require("./names.json");

let token = config.token;
let prefix = config.prefix;

async function saveGuilds()
{
    require('fs').writeFileSync('./guilds.json', JSON.stringify(guilds, null, '\t'));
    return true;
}
let utils = {
    sp: (int) => {
        int = int.toString();
        return int.split('').reverse().join('').match(/[0-9]{1,3}/g).join('.').split('').reverse().join('');
    },
}

robot.on("ready", function(){
    console.log(robot.user.username + " запустился!");
})

robot.on('messageCreate', msg => {
    if(msg.author.username !== robot.user.username && msg.author.discriminator !== robot.user.discriminator){
        var comm = msg.content.trim()+" ";
        var comm_name = comm.slice(0, comm.indexOf(" "));
        var messArr = comm.split(" ");
        let new_args = [];
        let ind = -1;
        for(let i in messArr) if(messArr[i] === '') messArr.splice(i, 1);
        for(let i in messArr) {
            if(i != 0 && messArr[i] !== '') {
                if(messArr[i].indexOf('"') > -1) {
                    messArr[i] = messArr[i].replace(/^"/, '');
                    if(messArr[i].indexOf('"') > -1 && ind === -1)
                    {
                        messArr[i] = messArr[i].replace(/"/gm, '');
                        new_args.push(messArr[i])
                    }
                    else {
                        messArr[i] = messArr[i].replace(/"/gm, '');
                        if(ind === -1) ind = Number(i);
                        else {
                            let r = [];
                            for(let j = ind; j <= i; j++) r.push(messArr[j]);
                            new_args.push(r.join(' '));
                            ind = -1;
                        }
                    }
                }
                else if(ind === -1) new_args.push(messArr[i])
            }
        }
        for(comm_count in comms.comms){
            var comm2 = guilds.find(x=> x.id === msg.guildId).settings.prefix + comms.comms[comm_count].name;
            if(comm2 === comm_name){
                comms.comms[comm_count].out(robot, msg, new_args);
            }
        }
    }
});
robot.on("guildCreate", async guild => {
    if (guilds[guild.id]) {
        console.log('true');
    } else {
        guilds.push({
            id: guild.id,
            settings: {
                prefix: "!",
                seller_role: null,
                price_channel: null,
                review_channel: null,
                orders_channel: null
            },
            orders: [],
            data: [],
            queue: []
        })
        await saveGuilds();
    }
});
robot.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        if(interaction.customId === 'createChannel') {

            if(guilds.find(x=> x.id === interaction.guildId).orders.find(x=> x.user.id === interaction.user.id)) {
                if(interaction.guild.channels.cache.get(guilds.find(x=> x.id === interaction.guildId).orders.find(x=> x.user.id === interaction.user.id).channel)) return interaction.reply({content: `У вас уже есть открытый заказ. ${interaction.guild.channels.cache.get(guilds.find(x=> x.id === interaction.guildId).orders.find(x=> x.user.id === interaction.user.id).channel).toString()}`, ephemeral: true})
                else {
                    guilds.find(x=> x.id === interaction.guildId).orders.splice(guilds.find(x=> x.id === interaction.guildId).orders.findIndex(x=> x.user.id === interaction.user.id), 1)
                    return interaction.reply({content: `У вас уже был старый открытый заказ. Мы его закрыли. Для оформления нового - нажмите на кнопку ещё раз`, ephemeral: true})
                }
            }
            let role = await interaction.guild.roles.create({
                name: `заказ_${guilds.find(x=> x.id === interaction.guildId).orders.length}`,
                color: 'BLUE',
                reason: 'test',
            })
            await interaction.guild.members.cache.get(interaction.user.id).roles.add(role)
            let dp = [
                {
                    id: interaction.guild.roles.everyone, //To make it be seen by a certain role, user an ID instead
                    allow: [], //Allow permissions
                    deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'] //Deny permissions
                },
                {
                    id: role.id, //To make it be seen by a certain role, user an ID instead
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'], //Allow permissions
                },
            ];
            if(interaction.guild.roles.cache.find(role=> role.name === guilds.find(x=> x.id === interaction.guildId).settings.seller_role)) dp.push({
                id: interaction.guild.roles.cache.find(role=> role.name === guilds.find(x=> x.id === interaction.guildId).settings.seller_role) , //To make it be seen by a certain role, user an ID instead
                allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'], //Allow permissions
            })
            let t = await interaction.guild.channels.create(`заказ_${guilds.find(x=> x.id === interaction.guildId).orders.length}`, {
                type: "text", //This create a text channel, you can make a voice one too, by changing "text" to "voice"
                permissionOverwrites: dp
            })

            /*const buttons = new MessageActionRow();

            const button1 = new MessageButton()
                .setLabel("Yes")
                .setStyle("SUCCESS")
                .setCustomId("yes");
            buttons.addComponents(button1);

            const button2 = new MessageButton()
                .setLabel("No")
                .setStyle("DANGER")
                .setCustomId("no");
            buttons.addComponents(button2);*/
            var hour = new Date().getHours();
            let greeting;
            if (hour >= 5 && hour < 12) greeting = "Доброе утро";
            else if (hour >= 12 && hour < 18) greeting = "Добрый день";
            else if (hour >= 18 && hour < 24) greeting = "Добрый вечер";
            else if (hour >= 0 && hour < 5) greeting = "Доброй ночи";
            let categorys = guilds.find(x=> x.id === interaction.guildId).items.slice(0);
            for(let i in categorys) categorys[i].value = `${i}`;
            const row = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId('main')
                        .setPlaceholder('Nothing selected')
                        .addOptions([
                            ...categorys,
                            {
                            label: 'Оформить заказ',
                            value: `${categorys.length}`
                        }]),
                );
            console.log(row);
            interaction.guild.channels.cache.get(t.id).send({content: `${greeting}! Напишите сюда, что бы вы хотели заказать.
Актуальный прайс-лист: ${interaction.guild.channels.cache.get(guilds.find(x=> x.id === interaction.guildId).settings.price_channel).toString()}`, components: [row]})

            guilds.find(x=> x.id === interaction.guildId).orders.push({
                user: interaction.user,
                data: [],
                step: 0,
                channel: t.id
            })
            await saveGuilds();
            interaction.deferUpdate();
        }
        if(interaction.customId.indexOf('empty_') !== -1) return interaction.deferUpdate();
        if(interaction.customId.indexOf('go_back_') !== -1) {
            let where = interaction.customId.split('_');

            let category = guilds.find(x=> x.id === interaction.guildId).items.find(x=> x.label === where[2]);
            console.log(category.label)
            for(let i in category.items) category.items[i].value = `${i}`;
                const select_menu = new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                            .setCustomId(`${category.label}`)
                            .setPlaceholder('Nothing selected')
                            .addOptions([...category.items, {
                                label: 'Назад',
                                value: `${category.length}`
                            }]),
                    );
                interaction.update({components: [select_menu]});
        }
        if(interaction.customId.indexOf('add') !== -1) {
            let args = interaction.customId.split('_');
            let order = guilds.find(x=> x.id === interaction.guildId).orders.find(x=> x.channel === interaction.channelId);
            let category = guilds.find(x=> x.id === interaction.guildId).items.find(x=> x.label === args[1]);
            let item = category.items.find(x=> x.label === args[2]);
            if(order.data.find(x=> x.name===args[2])) order.data.find(x=> x.name===args[2]).count += Number(args[3]);
            else order.data.push({
                name: args[2],
                count: Number(args[3])
            })
            saveGuilds();
            let components = [];
            for(let j = 0; j < 3; j++) {
                const lastComponent = new MessageActionRow();
                for(let i = 0; i < (category.step.length > 5 ? 5 : category.step.length); i++) {
                    const btn = new MessageButton()
                        .setLabel(`${j === 0 ? `+${category.step[i]}`: j === 1 ? i === Math.floor((category.step.length > 5 ? 5 : category.step.length)/2) ? `${order.data.find(x=> x.name===args[2]).count}` : ` ` : `-${category.step[i]}` }`)
                        .setStyle("SECONDARY")
                        .setCustomId(`${j === 1 ? `empty_${i}`: `${j === 0 ? 'add' : 'remove'}_${category.label}_${item.label}_${category.step[i]}`}`);
                    lastComponent.addComponents(btn);
                }
                components.push(lastComponent);
            }
            components.push(new MessageActionRow().addComponents(new MessageButton()
                .setLabel("Go back")
                .setStyle("DANGER")
                .setCustomId(`go_back_${category.label}`)))
            interaction.update({components: components});

            /*
            if(args[1] === 'ammo') {
                let components = [];
                const buttons_plus = new MessageActionRow();
                const btn1 = new MessageButton()
                    .setLabel("+100")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_ammo_${args[2]}_100`);
                buttons_plus.addComponents(btn1);
                const btn2 = new MessageButton()
                    .setLabel("+500")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_ammo_${args[2]}_500`);
                buttons_plus.addComponents(btn2);
                const btn3 = new MessageButton()
                    .setLabel("+1000")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_ammo_${args[2]}_1000`);
                buttons_plus.addComponents(btn3);
                components.push(buttons_plus);


                const buttons_info = new MessageActionRow();
                const btn_1 = new MessageButton()
                    .setLabel(" ")
                    .setStyle("SECONDARY")
                    .setCustomId("empty_1");
                buttons_info.addComponents(btn_1);
                const btn_2 = new MessageButton()
                    .setLabel(`${order.data.find(x=> x.name===args[2]).count}`)
                    .setStyle("SECONDARY")
                    .setCustomId("empty_2");
                buttons_info.addComponents(btn_2);
                const btn_3 = new MessageButton()
                    .setLabel(" ")
                    .setStyle("SECONDARY")
                    .setCustomId("empty_3");
                buttons_info.addComponents(btn_3);
                components.push(buttons_info);

                const buttons_minus = new MessageActionRow();
                const btn4 = new MessageButton()
                    .setLabel("-100")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_ammo_${args[2]}_100`);
                buttons_minus.addComponents(btn4);
                const btn5 = new MessageButton()
                    .setLabel("-500")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_ammo_${args[2]}_500`);
                buttons_minus.addComponents(btn5);
                const btn6 = new MessageButton()
                    .setLabel("-1000")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_ammo_${args[2]}_1000`);
                buttons_minus.addComponents(btn6);
                components.push(buttons_minus);
                const btn_back = new MessageActionRow();
                const back = new MessageButton()
                    .setLabel("Go back")
                    .setStyle("DANGER")
                    .setCustomId(`go_back_ammo`);
                btn_back.addComponents(back);
                components.push(btn_back);
                return interaction.update({components: components});
            }
            else if(args[1] === 'guns') {
                let components = [];


                const buttons_plus = new MessageActionRow();
                const btn1 = new MessageButton()
                    .setLabel("+1")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_guns_${args[2]}_1`);
                buttons_plus.addComponents(btn1);
                const btn2 = new MessageButton()
                    .setLabel("+5")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_guns_${args[2]}_5`);
                buttons_plus.addComponents(btn2);
                const btn3 = new MessageButton()
                    .setLabel("+10")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_guns_${args[2]}_10`);
                buttons_plus.addComponents(btn3);
                components.push(buttons_plus);


                const buttons_info = new MessageActionRow();
                const btn_1 = new MessageButton()
                    .setLabel(" ")
                    .setStyle("SECONDARY")
                    .setCustomId("empty_1");
                buttons_info.addComponents(btn_1);
                const btn_2 = new MessageButton()
                    .setLabel(`${order.data.find(x=> x.name===args[2]).count }`)
                    .setStyle("SECONDARY")
                    .setCustomId("empty_2");
                buttons_info.addComponents(btn_2);
                const btn_3 = new MessageButton()
                    .setLabel(" ")
                    .setStyle("SECONDARY")
                    .setCustomId("empty_3");
                buttons_info.addComponents(btn_3);
                components.push(buttons_info);

                const buttons_minus = new MessageActionRow();
                const btn4 = new MessageButton()
                    .setLabel("-1")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_guns_${args[2]}_1`);
                buttons_minus.addComponents(btn4);
                const btn5 = new MessageButton()
                    .setLabel("-5")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_guns_${args[2]}_5`);
                buttons_minus.addComponents(btn5);
                const btn6 = new MessageButton()
                    .setLabel("-10")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_guns_${args[2]}_10`);
                buttons_minus.addComponents(btn6);
                components.push(buttons_minus);

                const btn_back = new MessageActionRow();
                const back = new MessageButton()
                    .setLabel("Go back")
                    .setStyle("DANGER")
                    .setCustomId(`go_back_guns`);
                btn_back.addComponents(back);
                components.push(btn_back);

                interaction.update({components: components});
            }
            else if(args[1] === 'other') {
                let components = [];
                const buttons_plus = new MessageActionRow();
                const btn1 = new MessageButton()
                    .setLabel("+1")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_other_${args[2]}_1`);
                buttons_plus.addComponents(btn1);
                const btn2 = new MessageButton()
                    .setLabel("+5")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_other_${args[2]}_5`);
                buttons_plus.addComponents(btn2);
                const btn3 = new MessageButton()
                    .setLabel("+10")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_other_${args[2]}_10`);
                buttons_plus.addComponents(btn3);
                components.push(buttons_plus);


                const buttons_info = new MessageActionRow();
                const btn_1 = new MessageButton()
                    .setLabel(" ")
                    .setStyle("SECONDARY")
                    .setCustomId("empty_1");
                buttons_info.addComponents(btn_1);
                const btn_2 = new MessageButton()
                    .setLabel(`${order.data.find(x=> x.name===args[2]).count}`)
                    .setStyle("SECONDARY")
                    .setCustomId("empty_2");
                buttons_info.addComponents(btn_2);
                const btn_3 = new MessageButton()
                    .setLabel(" ")
                    .setStyle("SECONDARY")
                    .setCustomId("empty_3");
                buttons_info.addComponents(btn_3);
                components.push(buttons_info);

                const buttons_minus = new MessageActionRow();
                const btn4 = new MessageButton()
                    .setLabel("-1")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_other_${args[2]}_1`);
                buttons_minus.addComponents(btn4);
                const btn5 = new MessageButton()
                    .setLabel("-5")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_other_${args[2]}_5`);
                buttons_minus.addComponents(btn5);
                const btn6 = new MessageButton()
                    .setLabel("-10")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_other_${args[2]}_10`);
                buttons_minus.addComponents(btn6);
                components.push(buttons_minus);

                const btn_back = new MessageActionRow();
                const back = new MessageButton()
                    .setLabel("Go back")
                    .setStyle("DANGER")
                    .setCustomId(`go_back_other`);
                btn_back.addComponents(back);
                components.push(btn_back);

                interaction.update({components: components});
            }*/
        }
        if(interaction.customId.indexOf('remove') !== -1) {
            let args = interaction.customId.split('_');
            let order = guilds.find(x=> x.id === interaction.guildId).orders.find(x=> x.channel === interaction.channelId);
            let category = guilds.find(x=> x.id === interaction.guildId).items.find(x=> x.label === args[1]);
            let item = category.items.find(x=> x.label === args[2]);
            if(order.data.find(x=> x.name===args[2])) order.data.find(x=> x.name===args[2]).count - Number(args[3]) < 0 ? order.data.find(x=> x.name===args[2]).count = 0 : order.data.find(x=> x.name===args[2]).count -= Number(args[3]);
            else order.data.push({
                name: args[2],
                count: 0
            })
            let components = [];
            for(let j = 0; j < 3; j++) {
                const lastComponent = new MessageActionRow();
                for(let i = 0; i < (category.step.length > 5 ? 5 : category.step.length); i++) {
                    const btn = new MessageButton()
                        .setLabel(`${j === 0 ? `+${category.step[i]}`: j === 1 ? i === Math.floor((category.step.length > 5 ? 5 : category.step.length)/2) ? `${order.data.find(x=> x.name===args[2]).count}` : ` ` : `-${category.step[i]}` }`)
                        .setStyle("SECONDARY")
                        .setCustomId(`${j === 1 ? `empty_${i}`: `${j === 0 ? 'add' : 'remove'}_${category.label}_${item.label}_${category.step[i]}`}`);
                    lastComponent.addComponents(btn);
                }
                components.push(lastComponent);
            }
            components.push(new MessageActionRow().addComponents(new MessageButton()
                .setLabel("Go back")
                .setStyle("DANGER")
                .setCustomId(`go_back_${category.label}`)))
            interaction.update({components: components});
        }
    }

    else if(interaction.isSelectMenu()) {
        console.log(interaction.customId)
        if(interaction.customId === 'main') {
            let index = interaction.values[0];
            let categorys = guilds.find(x=> x.id === interaction.guildId).items.slice(0);
            for(let i in categorys) categorys[i].value = `${i}`;

            if(Number(index) === categorys.length) {
                let channel = interaction.guild.channels.cache.get(interaction.channelId).name.split('_')[1];;
                let embed = new Discord.MessageEmbed()
                    .setColor("#00ff00")
                    .setAuthor({ name: `${interaction.user.username}`, iconURL: `${interaction.user.avatarURL()}` })
                    .setTitle("Заказ №"+channel)
                let order = guilds.find(x=> x.id === interaction.guildId).orders.find(x=> x.channel === interaction.channelId);
                let all_sum = 0;
                if(order.data.length !== 0) {


                    for (let data in order.data) {
                        let inline = data+1 % 2 !== 0;
                        let gun;
                        for(let i = 0; i < guilds.find(x=> x.id === interaction.guildId).items.length; i++) {
                            if(guilds.find(x=> x.id === interaction.guildId).items[i].items.find(x=> x.label === order.data[data].name)) {
                                console.log('YES')
                                gun = guilds.find(x=> x.id === interaction.guildId).items[i].items.find(x=> x.label === order.data[data].name);
                                break;
                            }
                        }
                        console.log(gun)
                        all_sum += typeof gun.price === 'object' ? gun.price.find(x=> order.data[data].count < x.max).price * order.data[data].count : gun.price * order.data[data].count;
                        embed.addField(`${gun ? gun.label : 'undefined'}`, `Количество: ${order.data[data].count}`, inline);
                    }
                    interaction.update({content: `Ваш заказ успешно принят! 
Сумма вашего заказа: ${utils.sp(all_sum)}$
Ожидайте продавца.`, components: []});
                    embed.addField('Общая сумма заказа:', `${utils.sp(all_sum)}$`);
                    embed.addField('Перейти к заказу', `${interaction.channel.toString()}`);
                    let quote = await require('axios').get('https://api.forismatic.com/api/1.0/?method=getQuote&format=json');
                    embed.setFooter({text: `${quote.data.quoteText}`, iconURL: `https://cdn.discordapp.com/icons/818143875440181258/516ef1b8592f4a3207e52c2068a1c4bc.webp?size=128`})
                    return interaction.guild.channels.cache.get(guilds.find(x=> x.id === interaction.guildId).settings.orders_channel).send({embeds: [embed]})
                }
                return interaction.reply({content: `Заказ не может быть пустым!`, ephemeral: true});
            }
            else {
                for(let i in categorys.find(x=> x.value === index).items) categorys.find(x=> x.value === index).items[i].value = `${i}`
                const select_menu = new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                            .setCustomId(categorys.find(x=> x.value === index).label)
                            .setPlaceholder('Nothing selected')
                            .addOptions([...categorys.find(x=> x.value === index).items, {
                                label: 'Назад',
                                value: `${categorys.find(x=> x.value === index).items.length}`
                            }]),
                    );
                interaction.update({components: [select_menu]});
            }

            /*if(index === 0) {
                const select_menu = new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                            .setCustomId('ammo')
                            .setPlaceholder('Nothing selected')
                            .addOptions([
                                {
                                    label: '5.56mm',
                                    description: '3.4$ за шт. 5000+ - 3.3$ за шт. 10000+ - 3.2$ за шт.',
                                    value: '0',
                                },
                                {
                                    label: '12mm',
                                    description: '14$ за шт. 1000+ - 13$ за шт.',
                                    value: '1',
                                },
                                {
                                    label: '9mm',
                                    description: 'от 1-1000 - 8$ за шт.',
                                    value: '2',
                                },
                                {
                                    label: 'Назад',
                                    value: '3',
                                },
                            ]),
                    );
                interaction.update({components: [select_menu]});
            }
            if(index === 1) {
                const select_menu = new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                            .setCustomId('guns')
                            .setPlaceholder('Nothing selected')
                            .addOptions([
                                {
                                    label: 'ПДВ',
                                    description: '2050$ за шт. 10+ - 2000$ за шт. 30+ - 1950$ за шт.',
                                    value: '0',
                                },
                                {
                                    label: 'Ружьё для охоты',
                                    description: '8650$ за шт.',
                                    value: '1',
                                },
                                {
                                    label: 'Мини смг',
                                    description: '1.500$ за шт.',
                                    value: '2',
                                },
                                {
                                    label: 'Тяжелый пистолет',
                                    description: '1100$ за шт.',
                                    value: '3',
                                },
                                {
                                    label: 'Дробовик булл-пап',
                                    description: 'Цена договорная.',
                                    value: '4',
                                },
                                {
                                    label: 'Боевой пистолет',
                                    description: 'Цена договорная.',
                                    value: '5',
                                },
                                {
                                    label: 'Пистолет Mk2',
                                    description: 'Цена договорная.',
                                    value: '6',
                                },
                                {
                                    label: 'Автоматический пистолет',
                                    description: '1300$ за шт.',
                                    value: '7',
                                },
                                {
                                    label: 'Назад',
                                    value: '8',
                                },

                            ]),
                    );
                interaction.update({components: [select_menu]});
            }
            if(index === 2) {
                const select_menu = new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                            .setCustomId('other')
                            .setPlaceholder('Nothing selected')
                            .addOptions([
                                {
                                    label: 'Бинокль',
                                    description: 'Цена договорная.',
                                    value: '0',
                                },
                                {
                                    label: 'Нож для свежевания',
                                    description: '1600$ за шт.',
                                    value: '1',
                                },
                                {
                                    label: 'Назад',
                                    value: '2',
                                },
                            ]),
                    );
                interaction.update({components: [select_menu]});
            }*/

        }
        if(guilds.find(x=> x.id === interaction.guildId).items.find(x=> x.label === interaction.customId)) {
            let category = guilds.find(x=> x.id === interaction.guildId).items.find(x=> x.label === interaction.customId);
            console.log(category)
            let item = category.items[Number(interaction.values[0])];
            if(!item) {
                let categorys = guilds.find(x=> x.id === interaction.guildId).items.slice();
                for(let i in categorys) categorys[i].value = `${i}`;
                const row = new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                            .setCustomId('main')
                            .setPlaceholder('Nothing selected')
                            .addOptions([...categorys, {
                                label: 'Оформить заказ',
                                value: `${categorys.length}`
                            }]),
                    );
                interaction.update({components: [row]});
            }
            else {
                let order = guilds.find(x=> x.id === interaction.guildId).orders.find(x=> x.channel === interaction.channelId).data;
                let components = [];
                for(let j = 0; j < 3; j++) {
                    const lastComponent = new MessageActionRow();
                    for(let i = 0; i < (category.step.length > 5 ? 5 : category.step.length); i++) {
                        const btn = new MessageButton()
                            .setLabel(`${j === 0 ? `+${category.step[i]}`: j === 1 ? i === Math.floor((category.step.length > 5 ? 5 : category.step.length)/2) ? `${order.find(x=> x.name === item) ? order.find(x=> x.name === item).count : '0' }` : ` ` : `-${category.step[i]}` }`)
                            .setStyle("SECONDARY")
                            .setCustomId(`${j === 1 ? `empty_${i}`: `${j === 0 ? 'add' : 'remove'}_${category.label}_${item.label}_${category.step[i]}`}`);
                        lastComponent.addComponents(btn);
                    }
                    components.push(lastComponent);
                }
                components.push(new MessageActionRow().addComponents(new MessageButton()
                    .setLabel("Go back")
                    .setStyle("DANGER")
                    .setCustomId(`go_back_${category.label}`)))
                interaction.update({components: components});
            }
        }
        /*if(interaction.customId === 'other') {
            let index = Number(interaction.values[0]);
            let item;
            if(index === 0) item = 'binoc';
            if(index === 1) item = 'knife';
            if(index === 2) item = 'Back';
            console.log(index);
            if(item === 'Back')  {
                const row = new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                            .setCustomId('main')
                            .setPlaceholder('Nothing selected')
                            .addOptions([
                                {
                                    label: 'Патроны',
                                    value: '0',
                                },
                                {
                                    label: 'GUN*S',
                                    value: '1',
                                },
                                {
                                    label: 'Прочее',
                                    value: '2',
                                },
                                {
                                    label: 'Оформить заказ',
                                    value: '3',
                                },
                            ]),
                    );
                interaction.update({components: [row]});
            }
            else {
                let order = guilds.find(x=> x.id === interaction.guildId).orders.find(x=> x.channel === interaction.channelId).data;
                let components = [];

                const buttons_plus = new MessageActionRow();
                const btn1 = new MessageButton()
                    .setLabel("+1")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_other_${item}_1`);
                buttons_plus.addComponents(btn1);
                const btn2 = new MessageButton()
                    .setLabel("+5")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_other_${item}_5`);
                buttons_plus.addComponents(btn2);
                const btn3 = new MessageButton()
                    .setLabel("+10")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_other_${item}_10`);
                buttons_plus.addComponents(btn3);
                components.push(buttons_plus);


                const buttons_info = new MessageActionRow();
                const btn_1 = new MessageButton()
                    .setLabel(" ")
                    .setStyle("SECONDARY")
                    .setCustomId("empty_1");
                buttons_info.addComponents(btn_1);
                const btn_2 = new MessageButton()
                    .setLabel(`${order.find(x=> x.name === item) ? order.find(x=> x.name === item).count : '0' }`)
                    .setStyle("SECONDARY")
                    .setCustomId("empty_2");
                buttons_info.addComponents(btn_2);
                const btn_3 = new MessageButton()
                    .setLabel(" ")
                    .setStyle("SECONDARY")
                    .setCustomId("empty_3");
                buttons_info.addComponents(btn_3);
                components.push(buttons_info);

                const buttons_minus = new MessageActionRow();
                const btn4 = new MessageButton()
                    .setLabel("-1")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_other_${item}_1`);
                buttons_minus.addComponents(btn4);
                const btn5 = new MessageButton()
                    .setLabel("-5")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_other_${item}_5`);
                buttons_minus.addComponents(btn5);
                const btn6 = new MessageButton()
                    .setLabel("-10")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_other_${item}_10`);
                buttons_minus.addComponents(btn6);
                components.push(buttons_minus);

                const btn_back = new MessageActionRow();
                const back = new MessageButton()
                    .setLabel("Go back")
                    .setStyle("DANGER")
                    .setCustomId(`go_back_other`);
                btn_back.addComponents(back);
                components.push(btn_back);

                interaction.update({components: components});
            }
        }
        if(interaction.customId === 'guns') {
            let index = Number(interaction.values[0]);
            let item;
            if(index === 0) item = 'pdv';
            if(index === 1) item = 'oxota';
            if(index === 2) item = 'smg';
            if(index === 3) item = 'tpist';
            if(index === 4) item = 'drob';
            if(index === 5) item = 'bpist';
            if(index === 6) item = 'mk2';
            if(index === 7) item = 'autopist';
            if(index === 8) item = 'Back';
            if(item === 'Back')  {
                const row = new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                            .setCustomId('main')
                            .setPlaceholder('Nothing selected')
                            .addOptions([
                                {
                                    label: 'Патроны',
                                    description: 'This is a description',
                                    value: '0',
                                },
                                {
                                    label: 'GUN*S',
                                    description: 'This is also a description',
                                    value: '1',
                                },
                                {
                                    label: 'Прочее',
                                    description: 'This is also a description',
                                    value: '2',
                                },
                                {
                                    label: 'Оформить заказ',
                                    value: '3',
                                },
                            ]),
                    );
                interaction.update({components: [row]});
            }
            else {
                let order = guilds.find(x=> x.id === interaction.guildId).orders.find(x=> x.channel === interaction.channelId).data;
                let components = [];


                const buttons_plus = new MessageActionRow();
                const btn1 = new MessageButton()
                    .setLabel("+1")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_guns_${item}_1`);
                buttons_plus.addComponents(btn1);
                const btn2 = new MessageButton()
                    .setLabel("+5")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_guns_${item}_5`);
                buttons_plus.addComponents(btn2);
                const btn3 = new MessageButton()
                    .setLabel("+10")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_guns_${item}_10`);
                buttons_plus.addComponents(btn3);
                components.push(buttons_plus);


                const buttons_info = new MessageActionRow();
                const btn_1 = new MessageButton()
                    .setLabel(" ")
                    .setStyle("SECONDARY")
                    .setCustomId("empty_1");
                buttons_info.addComponents(btn_1);
                const btn_2 = new MessageButton()
                    .setLabel(`${order.find(x=> x.name === item) ? order.find(x=> x.name === item).count : '0' }`)
                    .setStyle("SECONDARY")
                    .setCustomId("empty_2");
                buttons_info.addComponents(btn_2);
                const btn_3 = new MessageButton()
                    .setLabel(" ")
                    .setStyle("SECONDARY")
                    .setCustomId("empty_3");
                buttons_info.addComponents(btn_3);
                components.push(buttons_info);

                const buttons_minus = new MessageActionRow();
                const btn4 = new MessageButton()
                    .setLabel("-1")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_guns_${item}_1`);
                buttons_minus.addComponents(btn4);
                const btn5 = new MessageButton()
                    .setLabel("-5")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_guns_${item}_5`);
                buttons_minus.addComponents(btn5);
                const btn6 = new MessageButton()
                    .setLabel("-10")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_guns_${item}_10`);
                buttons_minus.addComponents(btn6);
                components.push(buttons_minus);

                const btn_back = new MessageActionRow();
                const back = new MessageButton()
                    .setLabel("Go back")
                    .setStyle("DANGER")
                    .setCustomId(`go_back_guns`);
                btn_back.addComponents(back);
                components.push(btn_back);

                interaction.update({components: components});
            }

        }
        if(interaction.customId === 'ammo') {
            let index = Number(interaction.values[0]);
            let item;
            if(index === 0) item = '5.56';
            else if(index === 1) item = '12';
            else if(index === 2) item = '9';
            else if(index === 3) item = 'Back';
            if(item === 'Back' || interaction.values[0] === 'Back')  {
                const row = new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                            .setCustomId('main')
                            .setPlaceholder('Nothing selected')
                            .addOptions([
                                {
                                    label: 'Патроны',
                                    description: 'This is a description',
                                    value: '0',
                                },
                                {
                                    label: 'GUN*S',
                                    description: 'This is also a description',
                                    value: '1',
                                },
                                {
                                    label: 'Прочее',
                                    description: 'This is also a description',
                                    value: '2',
                                },
                                {
                                    label: 'Оформить заказ',
                                    value: '3',
                                },
                            ]),
                    );
                interaction.update({components: [row]});
            }
            else {
                let order = guilds.find(x=> x.id === interaction.guildId).orders.find(x=> x.channel === interaction.channelId).data;
                let components = [];


                const buttons_plus = new MessageActionRow();
                const btn1 = new MessageButton()
                    .setLabel("+100")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_ammo_${item}_100`);
                buttons_plus.addComponents(btn1);
                const btn2 = new MessageButton()
                    .setLabel("+500")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_ammo_${item}_500`);
                buttons_plus.addComponents(btn2);
                const btn3 = new MessageButton()
                    .setLabel("+1000")
                    .setStyle("SECONDARY")
                    .setCustomId(`add_ammo_${item}_1000`);
                buttons_plus.addComponents(btn3);
                components.push(buttons_plus);


                const buttons_info = new MessageActionRow();
                const btn_1 = new MessageButton()
                    .setLabel(" ")
                    .setStyle("SECONDARY")
                    .setCustomId("empty_1");
                buttons_info.addComponents(btn_1);
                const btn_2 = new MessageButton()
                    .setLabel(`${order.find(x=> x.name === item) ? order.find(x=> x.name === item).count : '0' }`)
                    .setStyle("SECONDARY")
                    .setCustomId("empty_2");
                buttons_info.addComponents(btn_2);
                const btn_3 = new MessageButton()
                    .setLabel(" ")
                    .setStyle("SECONDARY")
                    .setCustomId("empty_3");
                buttons_info.addComponents(btn_3);
                components.push(buttons_info);

                const buttons_minus = new MessageActionRow();
                const btn4 = new MessageButton()
                    .setLabel("-100")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_ammo_${item}_100`);
                buttons_minus.addComponents(btn4);
                const btn5 = new MessageButton()
                    .setLabel("-500")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_ammo_${item}_500`);
                buttons_minus.addComponents(btn5);
                const btn6 = new MessageButton()
                    .setLabel("-1000")
                    .setStyle("SECONDARY")
                    .setCustomId(`remove_ammo_${item}_1000`);
                buttons_minus.addComponents(btn6);
                components.push(buttons_minus);

                const btn_back = new MessageActionRow();
                const back = new MessageButton()
                    .setLabel("Go back")
                    .setStyle("DANGER")
                    .setCustomId(`go_back_ammo`);
                btn_back.addComponents(back);
                components.push(btn_back);

                interaction.update({components: components});
            }
        }*/
    }


    else if (interaction.isContextMenu()) {
        if(interaction.commandName === 'Отзыв') {
            if (interaction.guild.members.cache.get(interaction.user.id).roles.cache.find(role => role.name === guilds.find(x=> x.id === interaction.guildId).settings.seller_role) || interaction.member.permissions.has("ADMINISTRATOR") === true) {
                const repliedTo = await interaction.channel.messages.fetch(interaction.targetId);
                let channel = interaction.guild.channels.cache.get(interaction.channelId).name.split('_')[1];;
                let embed = new Discord.MessageEmbed()
                    .setColor("#00ff00")
                    .setTitle("Заказ №"+channel);
                if(repliedTo.content) embed.addField("Отзыв:", `${repliedTo.content}`)
                if(repliedTo.attachments) {
                    repliedTo.attachments.forEach(attachment => {
                        embed.setImage(attachment.proxyURL);
                    });
                }
                interaction.guild.channels.cache.get(guilds.find(x=> x.id === interaction.guildId).settings.review_channel).send({embeds: [embed]});
                interaction.reply({content: 'Отзыв успешно оставлен', ephemeral: true});
            }
        }
    }

});


robot.login(token);
