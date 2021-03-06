import { MockLog } from "mock-jest-console";
import React from "react";
import renderer from "react-test-renderer";
import { isNeedRxStoreChange } from "../helper";
import { Action, Actor, IMap, QL, Relax, Store, StoreProvider } from "../index";
import { PQL } from "../pql";

//===============Actor=========================
class LoadingActor extends Actor {
  defaultState() {
    return {
      loading: false
    };
  }
}

class HelloActor extends Actor {
  defaultState() {
    return { mott: "hello world!", list: [{ dream: "build tools for humna" }] };
  }

  @Action("change")
  change(state: IMap, text: string) {
    return state.set("mott", text);
  }
}

//===================Store======================
class AppStore extends Store {
  constructor(props: Object) {
    super(props);
    window["_store"] = this;
  }

  bindActor() {
    return [LoadingActor, HelloActor];
  }
}

//========================UI======================
@StoreProvider(AppStore, { debug: true })
class HelloApp extends React.Component {
  render() {
    return <HelloRelax />;
  }
}

const loadingQL = QL("loadingQL", ["loading", loading => loading]);

const mottQL = QL("mottQL", [
  loadingQL,
  "mott",
  (loading, mott) => ({ loading, mott })
]);

const loadingPQL = PQL("loadingPQL", mottFlag =>
  QL("loadingPQL", [mottFlag, mott => mott])
);

@Relax
class HelloRelax extends React.Component {
  props: {
    mottFlag?: string;
    relaxProps?: {
      loading: boolean;
      mott: string;
      loadingQL: boolean;
      mottQL: { loading: boolean; mott: string };
      loadingPQL: (mott: string) => string;
    };
  };

  static relaxProps = {
    loading: "loading",
    mott: "mott",
    loadingQL,
    mottQL,
    loadingPQL
  };

  render() {
    const {
      loading,
      mott,
      loadingQL,
      mottQL,
      loadingPQL
    } = this.props.relaxProps;

    expect(false).toEqual(loadingQL);
    expect({ loading: false, mott: "hello world!" }).toEqual(mottQL);
    expect("hello world!").toEqual(loadingPQL("mott"));

    return (
      <div>
        <div>{loading}</div>
        <div>{mott}</div>
      </div>
    );
  }
}

//===================TestApp======================
@Relax
class WorldRelax extends React.Component {
  props: {
    mottFlag?: string;
    relaxProps?: {
      loading: boolean;
      mott: string;
      loadingQL: boolean;
      mottQL: { loading: boolean; mott: string };
      loadingPQL: (mott: string) => string;
    };
  };

  static relaxProps = [
    "loading",
    "mott",
    {
      loadingQL,
      mottQL,
      loadingPQL
    }
  ];

  render() {
    const {
      loading,
      mott,
      loadingQL,
      mottQL,
      loadingPQL
    } = this.props.relaxProps;

    expect(false).toEqual(loadingQL);
    expect({ loading: false, mott: "hello world!" }).toEqual(mottQL);
    expect("hello world!").toEqual(loadingPQL("mott"));

    return (
      <div>
        <div>{loading}</div>
        <div>{mott}</div>
      </div>
    );
  }
}

@StoreProvider(AppStore, { debug: true })
class TestApp extends React.Component {
  render() {
    return <WorldRelax />;
  }
}

//=============================================================================

@Relax
class ArrayRelax extends React.Component {
  props: {
    relaxProps?: {
      loading: boolean;
      mott: string;
      dream: string;
      loadingPQL: Function;
      mottQL: { loading: boolean; mott: string };
    };
  };

  static relaxProps = [
    "loading",
    "mott",
    ["list", 0, "dream"],
    mottQL,
    loadingPQL
  ];

  render() {
    const { loading, mott, dream, loadingPQL, mottQL } = this.props.relaxProps;
    console.log(this.props.relaxProps);

    return (
      <div>
        <div>{loading}</div>
        <div>{mott}</div>
        <div>{dream}</div>
        <div>{loadingPQL("mott")}</div>
        <div>{`${mottQL.loading}-${mottQL.mott}`}</div>
      </div>
    );
  }
}

@StoreProvider(AppStore, { debug: true })
class TestArrayRelax extends React.Component {
  render() {
    return <ArrayRelax />;
  }
}

describe("relax test suite", () => {
  it("initial render relax", () => {
    const mock = new MockLog();
    const tree = renderer.create(<HelloApp />).toJSON();
    expect(tree).toMatchSnapshot();
    expect(mock.logs).toMatchSnapshot();
  });

  it("test app relaxprops", () => {
    const mock = new MockLog();
    const tree = renderer.create(<TestApp />).toJSON();
    expect(tree).toMatchSnapshot();
    expect(mock.logs).toMatchSnapshot();
  });

  it("test app relax array props", () => {
    const mock = new MockLog();
    const tree = renderer.create(<TestArrayRelax />).toJSON();
    expect(tree).toMatchSnapshot();
    expect(mock.logs).toMatchSnapshot();
  });

  it("dispatch event", () => {
    @StoreProvider(AppStore)
    class HelloApp extends React.Component {
      render() {
        return <Hello />;
      }
    }

    @Relax
    class Hello extends React.Component {
      props: { relaxProps?: { mott: string } };

      static relaxProps = {
        mott: "mott"
      };

      render() {
        return (
          <div>
            <div>{this.props.relaxProps.mott}</div>
          </div>
        );
      }
    }

    const component = renderer.create(<HelloApp />);
    const store = window["_store"] as AppStore;
    store.dispatch("change", "hello plume");
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("no relax-props warnning", () => {
    @StoreProvider(AppStore)
    class WarnApp extends React.Component {
      render() {
        return <RelaxTest />;
      }
    }

    @Relax
    class RelaxTest extends React.Component {
      render() {
        return <div />;
      }
    }

    renderer.create(<WarnApp />).toJSON();
  });
});

it("test relaxProps is not need rx", () => {
  expect(isNeedRxStoreChange({ hello: "hello" })).toEqual(true);

  expect(
    isNeedRxStoreChange({
      hello: ["state", "hello"]
    })
  ).toEqual(true);

  expect(isNeedRxStoreChange({ ql: loadingQL })).toEqual(true);

  expect(
    isNeedRxStoreChange({
      viewAction: "viewAction"
    })
  ).toEqual(false);

  expect(
    isNeedRxStoreChange({
      fn: () => {}
    })
  ).toEqual(false);

  expect(
    isNeedRxStoreChange({
      pql: loadingPQL
    })
  ).toEqual(false);
});
