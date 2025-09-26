import React from "react";
import { describe, it, beforeEach, expect, mock } from "bun:test";
import TestRenderer, { act } from "react-test-renderer";

const pushMock = mock(() => {});
const replaceMock = mock(() => {});

const createPrimitive = (type: string) => {
  const Component = (props: any) => React.createElement(type, props, props.children);
  Component.displayName = type;
  return Component;
};

mock.module("react-native", () => {
  const Text = createPrimitive("Text");
  const View = createPrimitive("View");
  const TouchableOpacity = (props: any) =>
    React.createElement("TouchableOpacity", props, props.children);
  TouchableOpacity.displayName = "TouchableOpacity";

  const FlatList = (props: any) => {
    const { data = [], renderItem, ListEmptyComponent, ...rest } = props;
    const children: any[] = [];

    if (Array.isArray(data) && data.length > 0 && typeof renderItem === "function") {
      data.forEach((item, index) => {
        const element = renderItem({ item, index });
        if (React.isValidElement(element)) {
          children.push(React.cloneElement(element, { key: element.key ?? index }));
        } else if (element != null) {
          children.push(element);
        }
      });
    } else if (ListEmptyComponent) {
      if (typeof ListEmptyComponent === "function") {
        const rendered = ListEmptyComponent({});
        if (rendered != null) children.push(rendered);
      } else {
        children.push(ListEmptyComponent);
      }
    }

    return React.createElement("FlatList", { ...rest }, children.length > 0 ? children : props.children);
  };
  FlatList.displayName = "FlatList";

  const StyleSheet = { create: (styles: any) => styles };

  return {
    Text,
    View,
    TouchableOpacity,
    FlatList,
    StyleSheet,
  };
});

mock.module("expo-router", () => ({
  Redirect: (props: any) => React.createElement("Redirect", props),
  router: {
    push: pushMock,
    replace: replaceMock,
  },
}));

mock.module("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

mock.module("expo-status-bar", () => ({ StatusBar: () => null }));

mock.module("expo-navigation-bar", () => ({
  setVisibilityAsync: async () => {},
  setBehaviorAsync: async () => {},
}));

mock.module("expo-font", () => ({
  useFonts: () => [true],
}));

mock.module("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: any) => React.createElement("SafeAreaProvider", null, children),
  SafeAreaView: ({ children }: any) => React.createElement("SafeAreaView", null, children),
}));

const getMyProfessionalMock = mock(async () => ({ id: 10 }));
const getPatientsForProfessionalMock = mock(async () => [
  {
    id: 1,
    user: { nombre: "Paciente Demo", rut: "11.111.111-1" },
  },
]);
const getImagesForPatientMock = mock(async () => [{ id: 99 }]);

mock.module("@/lib/api", () => ({
  getMyProfessional: getMyProfessionalMock,
  getPatientsForProfessional: getPatientsForProfessionalMock,
  getImagesForPatient: getImagesForPatientMock,
}));

mock.module("@/components/ui", () => ({
  AppHeader: ({ children }: any) => React.createElement("AppHeader", null, children),
  Card: ({ children }: any) => React.createElement("Card", null, children),
  StatCard: ({ title, value }: any) => React.createElement("StatCard", { title, value }),
  layoutStyles: { container: {}, body: {}, row: {} },
}));

const { Text, TouchableOpacity } = (await import("react-native")) as any;
const { default: AppIndex } = await import("../app/index");
const { default: MyPatients } = await import("../app/professional/index");

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("App entry navigation", () => {
  it("redirects authenticated users to the professional dashboard", () => {
    const element = AppIndex({});
    expect(element?.props?.href).toBe("/professional");
  });
});

describe("MyPatients screen integration", () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    getMyProfessionalMock.mockReset();
    getPatientsForProfessionalMock.mockReset();
    getImagesForPatientMock.mockReset();

    getMyProfessionalMock.mockImplementation(async () => ({ id: 10 }));
    getPatientsForProfessionalMock.mockImplementation(async () => [
      {
        id: 1,
        user: { nombre: "Paciente Demo", rut: "11.111.111-1" },
      },
    ]);
    getImagesForPatientMock.mockImplementation(async () => [{ id: 99 }]);
  });

  it("loads patients and navigates to detail on press", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<MyPatients />);
    });

    await act(async () => {
      await flushMicrotasks();
      await flushMicrotasks();
    });

    const buttons = renderer!.root.findAllByType(TouchableOpacity);
    expect(buttons.length).toBeGreaterThan(0);

    await act(async () => {
      buttons[0].props.onPress();
    });

    expect(pushMock).toHaveBeenCalledWith({
      pathname: "/professional/patient",
      params: { id: "1" },
    });
    expect(getImagesForPatientMock).toHaveBeenCalledWith(1);
  });

  it("renders the empty state when the API fails", async () => {
    getMyProfessionalMock.mockImplementationOnce(async () => {
      throw new Error("Fallo al autenticar");
    });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<MyPatients />);
    });

    await act(async () => {
      await flushMicrotasks();
    });

    const texts = renderer!
      .root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat();

    expect(texts).toContain("No hay pacientes");
  });
});
