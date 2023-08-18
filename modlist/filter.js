const detail_filters = {
    any:{
        display_name:"Any"
    },
    name:{
        display_name:"Name",
    },
    type:{
        display_name:"Mod Type",
    },
    id:{
        display_name:"Package ID",
    },
    element:{
        display_name:"Element",
    },
    card_code:{
        display_name:"Card Code",
    },
    card_class:{
        display_name:"Card Class",
    },
    author_name:{
        display_name:"Author",
    },
    tags:{
        display_name:"Tags",
    },
}

const sort_options={
    timestamp:{
        display_name:"Date",
        sort_detail:"timestamp"
    },
    damage:{
        display_name:"Damage",
        sort_detail:"damage"
    },
}

const search_aliases = [
    ["exe1","bn1"],
    ["exe2","bn2"],
    ["exe3","bn3"],
    ["exe4","bn4"],
    ["exe4.5","bn4.5"],
    ["exe5","bn5"],
    ["exe6","bn6"],
    ["genso","shanghai"],
    ["enemy","enemies"],
    ["navi","player"],
    ["block","ncp"]
]

class ModsFilter{
    constructor(){
        this.create()
    }
    get_html_element(){
        return this.element
    }
    create(){
        this.update(this.data)
    }
    filter_changed_callback(){
        console.log('replace this')
    }
    update(){
        if(!this.element){
            this.element = document.createElement('div')
            this.element.classList.add('filter')
        }
        if(!this.p_name){
            this.p_name = document.createElement('p')
            this.p_name.textContent = "Filter"
            this.p_name.classList.add('name')
            this.element.appendChild(this.p_name)
        }
        if(!this.select){
            this.select = document.createElement('select')
            this.element.appendChild(this.select)
            
            for(let field_name in detail_filters){
                let field = detail_filters[field_name]
                let option = document.createElement('option')
                option.value = field_name
                option.textContent = field.display_name
                this.select.appendChild(option)
            }

            this.select.onchange = ()=>{
                let filter_id = this.select.value
                let filter_value = this.input.value
                this.filter_changed_callback(filter_id,filter_value)
            }
        }
        if(!this.input){
            this.input = document.createElement('input')
            this.element.appendChild(this.input)
        }
        this.input.oninput = ()=>{
            let filter_id = this.select.value
            let filter_value = this.input.value
            this.filter_changed_callback(filter_id,filter_value)
        }
    }
}

class ModsSorter extends ModsFilter{
    constructor(){
        super()
    }
    selection_changed_callback(){
        console.log('replace this')
    }
    update(){
        if(!this.element){
            this.element = document.createElement('div')
            this.element.classList.add('filter')
        }
        if(!this.p_name){
            this.p_name = document.createElement('p')
            this.p_name.textContent = "Sort"
            this.p_name.classList.add('name')
            this.element.appendChild(this.p_name)
        }
        if(!this.select){
            this.select = document.createElement('select')
            this.element.appendChild(this.select)
            
            for(let field_name in sort_options){
                let field = sort_options[field_name]
                let option = document.createElement('option')
                option.value = field_name
                option.textContent = field.display_name
                this.select.appendChild(option)
            }

            this.select.onchange = ()=>{
                let select_value = this.select.value
                this.selection_changed_callback(select_value)
            }
        }
    }
}

export {ModsFilter,ModsSorter,detail_filters,sort_options,search_aliases}