import ServerNode from './ServerNode.js'
import {config} from '../config.js'
import {create_append_add_classes} from '../helpers.js'

const div_mods = document.getElementById('servers')
const div_filters = document.getElementById('filters')
const server_nodes = {}

//filtering stuff
import {ModsFilter,ModsSorter,detail_filters,sort_options,search_aliases} from './server_filter.js'
let selection_changed_timeout;
let current_sorter_id = "player_count"
let filter = new ModsFilter()
let sorter = new ModsSorter()

div_filters.appendChild(filter.get_html_element())
filter.filter_changed_callback = (filter_id,filter_value)=>{
    filter_mod_list(filter_id,filter_value)
}
div_filters.appendChild(sorter.get_html_element())
sorter.selection_changed_callback = (sorter_id)=>{
    current_sorter_id = sorter_id
    sort_mod_list(current_sorter_id)
}

//we will request the server list hre in future
import sample_servers from "./samplejson.js" 

let server_list

const exampleSocket = new WebSocket(config.websocet_api_url, 'version1');
exampleSocket.onmessage = (event) =>{
    if(event.origin != config.websocet_api_url || !event.isTrusted){
        return //filter out all messages from peers
    }
    let data = JSON.parse(event.data)
    //now update display
    for(let server_id in data){
        for(let field_name in data[server_id]){
            console.log(`updating ${server_list[server_id][field_name]} to ${data[server_id][field_name]}`)
            server_list[server_id][field_name] = data[server_id][field_name]
        }
    }
    update_server_nodes(server_nodes)
    sort_mod_list(current_sorter_id)
}

let btn_mods = create_append_add_classes("button",div_filters,[])
btn_mods.textContent = "View Mods"
btn_mods.onclick = ()=>{
    location.href = "index.html"
}
let btn_map = create_append_add_classes("button",div_filters,[])
btn_map.textContent = "Open Map"
btn_map.onclick = ()=>{
    window.open("map.html");
}

async function main(){
    if(config.debug){
        server_list = sample_servers
    }else{
        server_list = await get_server_list(false)
    }
    update_server_nodes(server_nodes)
    render_server_nodes(server_nodes)
    sort_mod_list(current_sorter_id)
}

function get_server_list(get_test_list_instead) {
    return new Promise(async(resolve, reject) => {
        if(get_test_list_instead){
            resolve(sample_servers)
        }else{
            const request = new Request(`${config.api_url}/server_list/`, {
                method: 'GET'
            });
            fetch(request).then(response => response.json())
            .then(data => {
                resolve(data)
            })
        }
    })
}

function update_server_nodes(server_nodes) {
    for (let server_id in server_list) {
        let server_data = server_list[server_id]

        if(!server_data){
            return
        }
        if (server_nodes[server_id]) {
            //if a mod node already exists for this mod
            console.log('updating',server_id)
            server_nodes[server_id].update(server_data)
        } else {
            console.log('creating',server_id)
            let new_server_node = new ServerNode(server_id, server_data)
            server_nodes[server_id] = new_server_node
        }
    }
}

function render_server_nodes(server_nodes) {
    for (let mod_id in server_nodes) {
        let server_node = server_nodes[mod_id]
        div_mods.appendChild(server_node.get_html_element())
    }
}

function sort_mod_list(sorter_id){
    let sorter = sort_options[sorter_id]
    let server_node_keys = Object.keys(server_nodes)
    let sort_func = function(a,b){
        let mod_a_online_bonus = mod_a.is_online ? 1 : 0
        let mod_b_online_bonus = mod_b.is_online ? 1 : 0
        let mod_a = server_nodes[a]
        let mod_b = server_nodes[b]
        return (mod_b.details[sorter.sort_detail] + mod_b_online_bonus) - (mod_a.details[sorter.sort_detail] + mod_a_online_bonus)
    }
    server_node_keys.sort(sort_func)
    let i = 1
    for(let key of server_node_keys){
        let server_node = server_nodes[key]
        server_node.element.style.order = i
        i++
    }
}

function filter_mod_list(filter_id,filter_value){
    let filter_data = detail_filters[filter_id]
    //if no filter value is provided, search for wildcard
    filter_value = filter_value.toLowerCase()
    if(filter_value == ""){
        filter_value = "."
    }
    for(let alias_array of search_aliases){
        if(alias_array.includes(filter_value)){
            filter_value = alias_array.join("|")
            console.log("repalced filter with",filter_value)
        }
    }
    let filterRegexp = new RegExp(filter_value,'gi')
    //make a list of all the detail keys to filter against
    let filter_ids = [filter_id]
    //check if each mod should be hidden by comparing the filter_value to the details
    let matches = 0
    for(let mod_id in server_nodes){
        let server_node = server_nodes[mod_id]
        let node_should_be_hidden = true
        for(let filter_id of filter_ids){
            if(!should_node_be_hidden(server_node,filter_id,filterRegexp)){
                node_should_be_hidden = false
                break
            }
        }
        server_node.set_hidden(node_should_be_hidden)
        if(!node_should_be_hidden){
            matches++
        }
    }
    //update filter title
    filter.p_name.textContent = `Filter (${matches}) results`
}

function should_node_be_hidden(server_node,filter_id,regexp){
    let key_value = server_node.details[filter_id]
    let should_hide = true
    if(key_value == undefined){
        should_hide = true
    }else if(Array.isArray(key_value)){
        for(let value of key_value){
            if(value.match(regexp)){
                should_hide = false
                break;
            }
        }
    }else if(key_value.match(regexp)){
        should_hide = false
    }
    return should_hide
}

main()