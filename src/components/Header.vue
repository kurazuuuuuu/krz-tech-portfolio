<template>
  <header>
    <div class="container">
      <div class="header-link">
        <nav>
          <a href="#">About</a>
          <a href="https://github.com/kurazuuuuuu/">Products</a>
          <a href="#">Contact</a>
        </nav>
      </div>
    </div>
  </header>
</template>

<style scoped>
header {
  height: 80px;
  background-color: #789d78;
  margin-bottom: 100px;
}

.header-link nav {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 20px;
  flex-wrap: wrap;
}

.header-link a {
  padding: 25px 20px;
  font-size: 15px;
  text-decoration: none;
  color: #ffffff;
}
</style>