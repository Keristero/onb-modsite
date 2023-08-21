function create_append_add_classes(tag,parent,classes){
    let element = document.createElement(tag)
    for(let class_name of classes){
        element.classList.add(class_name)
    }
    parent.appendChild(element)
    return element
}

export {create_append_add_classes}