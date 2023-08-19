import {config} from '../config.js'

function create_append_add_classes(tag,parent,classes){
    let element = document.createElement(tag)
    for(let class_name of classes){
        element.classList.add(class_name)
    }
    parent.appendChild(element)
    return element
}

function setClipboard(text) {
    const type = "text/plain";
    const blob = new Blob([text], { type });
    const data = [new ClipboardItem({ [type]: blob })];
  
    navigator.clipboard.write(data).then(
      () => {
        /* success */
      },
      () => {
        /* failure */
      },
    );
  }

class ServerNode{
    constructor(server_id,server_data){
        this.id = server_id
        this.data = server_data
        this.hidden = false
        this.create()
    }
    set_hidden(should_be_hidden){
        if(should_be_hidden && !this.hidden){
            this.hidden = true
            this.element.style.display = "none"
        }else if(!should_be_hidden && this.hidden){
            this.hidden = false
            this.element.style.display = "block"
        }
    }
    get_html_element(){
        return this.element
    }
    create(){
        this.update(this.data)
    }
    get is_online(){
        return (Date.now() - this.data.last_alive_ts) < (1000*60*60)
    }
    update(latest_mod_data){
        this.data = latest_mod_data
        if(!this.element){
            this.element = document.createElement('div')
            this.element.style.backgroundColor = this.data.details.color
        }
        //clear class list
        this.element.classList.remove(...this.element.classList);
        this.element.classList.add("server");

        //dark overlay
        if(!this.dark_overlay){
            this.dark_overlay = create_append_add_classes('div',this.element,["dark_overlay"])
        }

        //preview window
        if(!this.preview_window){
            this.preview_window = create_append_add_classes('p',this.dark_overlay,["preview_window","disable_selection"])
        }
        //-->In preview window
        if(!this.chip_preview){
            this.chip_preview = create_append_add_classes('img',this.preview_window,["chip_preview"])
        }
        this.chip_preview.src = `${config.api_url}/server_images/${this.id}.png`


        //description window
        if(!this.description_window){
            this.description_window = create_append_add_classes("p",this.dark_overlay,["description_window"])
        }
        //-->In description window
        if(!this.p_name){
            this.p_name = create_append_add_classes("p",this.description_window,["name"])
        }
        this.p_name.textContent = this.data.details.name

        if(!this.p_description){
            this.p_description = create_append_add_classes("p",this.description_window,["description"])
        }
        this.p_description.textContent = this.data.details.description

        if(!this.pre_address){
            this.pre_address = create_append_add_classes("pre",this.description_window,["address"])
        }
        this.pre_address.textContent = this.data.details.address
        //-->In description window--> in address bar
        if(!this.btn_copy_address){
            this.btn_copy_address = create_append_add_classes("button",this.pre_address,[])
            this.btn_copy_address.textContent = "copy address"
            this.btn_copy_address.onclick = ()=>{
                setClipboard("memes")
                this.btn_copy_address.textContent = "copied!"
                setTimeout(()=>{
                    this.btn_copy_address.textContent = "copy address"
                },1000)
            }
        }
         //status box
         if(!this.div_status_box){
            this.div_status_box = create_append_add_classes("div",this.dark_overlay,["status"])
        }
        //in status box
        if(!this.p_online_status){
            this.p_online_status = create_append_add_classes("p",this.div_status_box,["online_status"])
        }
        //clear class list
        this.p_online_status.classList.remove(...this.p_online_status.classList);
        this.p_online_status.classList.add("online_status");
        if(this.is_online){
            this.p_online_status.classList.add("online")
            this.p_online_status.textContent = "ONLINE"
        }else{
            this.p_online_status.classList.add("offline")
            this.p_online_status.textContent = "OFFLINE"
        }

        if(!this.p_players_online){
            this.p_players_online = create_append_add_classes("p",this.div_status_box,["players_online"])
        }
        this.p_players_online.textContent = `players: ${this.data.online_players}`
        if(this.is_online){
            this.p_players_online.hidden = false
        }else{
            this.p_players_online.hidden = true
        }

   
    }
}

export default ServerNode