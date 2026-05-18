import { Query } from "../Query";

describe("Query Optimization", () => {
    test("getEntitiesView should return the same instance if no changes", () => {
        const query = new Query(["A"]);
        query.add(1);
        query.add(2);

        const view1 = query.getEntitiesView();
        const view2 = query.getEntitiesView();

        expect(view1).toBe(view2);
    });

    test("forEach should iterate over all entities", () => {
        const query = new Query(["A"]);
        query.add(1);
        query.add(2);
        query.add(3);

        const entities: number[] = [];
        query.forEach(e => entities.push(e));

        expect(entities).toEqual([1, 2, 3]);
    });

    test("getEntities should return a new instance every time", () => {
        const query = new Query(["A"]);
        query.add(1);

        const entities1 = query.getEntities();
        const entities2 = query.getEntities();

        expect(entities1).not.toBe(entities2);
        expect(entities1).toEqual(entities2);
    });
});
