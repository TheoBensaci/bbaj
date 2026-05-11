// Our helper class that will make things look better
export class MixinBuilder {
    constructor(superclass) {
        this.superclass = superclass;
    }
    with(...mixins) {
        return mixins.reduce((c, mixin) => mixin(c), this.superclass);
    }
}

export const mixClass = (superclass) => new MixinBuilder(superclass);
